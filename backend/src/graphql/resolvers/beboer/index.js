const formaterBeboer = require("./formaterBeboer");
const validerEpostAdresse = require("./validerEpostAdresse");
const bcrypt = require("bcryptjs");

const beboerQuery = {
  hentBeboer: async (parent, args, context) => {
    try {
      const beboer = await context.prisma.beboer.findUnique({
        where: {
          id: args.id,
        },
        include: {
          rolle: true,
          studie: true,
          skole: true,
          bruker: true,
          rom: {
            include: {
              romtype: true,
            },
          },
          beboer_verv: {
            include: {
              verv: true,
            },
          },
        },
      });

      return formaterBeboer(context, beboer);
    } catch (err) {
      throw err;
    }
  },
  hentBeboere: async (parent, args, context) => {
    try {
      const beboere = await context.prisma.beboer.findMany({
        where: {
          NOT: {
            fornavn: {
              contains: "Utvalget",
            },
          },
          romhistorikk: {
            contains: '"utflyttet":null',
          },
          perm: 0,
        },
        include: {
          rolle: true,
          studie: true,
          skole: true,
          bruker: true,
          rom: {
            include: {
              romtype: true,
            },
          },
          beboer_verv: {
            include: {
              verv: true,
            },
          },
        },
      });

      return await beboere.map((beboer) => {
        return formaterBeboer(context, beboer);
      });
    } catch (err) {
      throw err;
    }
  },
  hentGamleBeboere: async (parent, args, context) => {
    try {
      const beboere = await context.prisma.beboer.findMany({
        where: {
          NOT: {
            fornavn: {
              contains: "Utvalget",
            },
          },
          NOT: {
            romhistorikk: {
              contains: '"utflyttet":null',
            },
          },
        },
        include: {
          rolle: true,
          studie: true,
          skole: true,
          bruker: true,
          rom: {
            include: {
              romtype: true,
            },
          },
          beboer_verv: {
            include: {
              verv: true,
            },
          },
        },
      });

      return await beboere.map((beboer) => {
        return formaterBeboer(context, beboer);
      });
    } catch (err) {
      throw err;
    }
  },
  hentBeboerePerm: async (parent, args, context) => {
    try {
      const beboere = await context.prisma.beboer.findMany({
        where: {
          NOT: {
            fornavn: {
              contains: "Utvalget",
            },
          },
          perm: 1,
        },
        include: {
          rolle: true,
          studie: true,
          skole: true,
          bruker: true,
          rom: {
            include: {
              romtype: true,
            },
          },
          beboer_verv: {
            include: {
              verv: true,
            },
          },
        },
      });

      return await beboere.map((beboer) => {
        return formaterBeboer(context, beboer);
      });
    } catch (err) {
      throw err;
    }
  },
  hentPrefs: async (parent, args, context) => {
    try {
      return await context.prisma.prefs.findFirst({
        where: {
          beboerId: args.beboerId,
        },
      });
    } catch (err) {
      throw err;
    }
  },
  hentEpostPrefs: async (parent, args, context) => {
    try {
      return await context.prisma.epost_pref.findFirst({
        where: { beboer_id: args.beboerId },
      });
    } catch (err) {
      throw err;
    }
  },
};

const beboerMutation = {
  flyttBeboer: async (parent, args, context) => {
    try {
      const beboerRomhistorikk = await context.prisma.beboer.findUnique({
        where: {
          id: args.id,
        },
        select: {
          romhistorikk: true,
        },
      });

      // Romhistorikk er en string som vi gjør om til en array av objekter:
      let beboerRom = JSON.parse(beboerRomhistorikk.romhistorikk);

      // Oppdaterer utflytt til valgt dato
      beboerRom[beboerRom.length - 1].utflyttet = new Date(args.utflytt)
        .toISOString()
        .split("T")[0];

      // Legger til et objekt som er det nye rommet og innflytt
      beboerRom.push({
        romId: String(args.romId),
        innflyttet: new Date(args.innflytt).toISOString().split("T")[0],
        utflyttet: null,
      });

      const beboer = await context.prisma.beboer.update({
        where: {
          id: args.id,
        },
        data: {
          romhistorikk: JSON.stringify(beboerRom),
        },
        include: {
          rolle: true,
          studie: true,
          skole: true,
          bruker: true,
          rom: {
            include: {
              romtype: true,
            },
          },
          beboer_verv: {
            include: {
              verv: true,
            },
          },
        },
      });

      return formaterBeboer(context, beboer);
    } catch (err) {
      throw err;
    }
  },

  // Denne funksjonen er for å flytte inn nye beboere
  // Den lager en bruker og tildeler et tilfeldig passord (som ikke kommer til å bli brukt)
  // Den nye beboeren må ta i bruk "glemt passsord"-funksjonen for å sette nytt passord og logge inn
  lagBeboer: async (parent, args, context) => {
    try {
      const MAX_LENGDE = 16;
      const MIN_LENGDE = 8;
      const SALT_ROUNDS = 10;
      let data = {};
      let romhistorikk = [];

      // Denne er for å kun ta med de feltene som faktisk er fyllt ut når vi skal lage beboer:
      for (let key in args.data) {
        if (key === "epost") {
          if (!validerEpostAdresse(args.data[key])) {
            return Error("Eposten er ikke gyldig!");
          }
          data[key] = args.data[key];
        } else if (key === "rom_id") {
          romhistorikk.push({
            romId: String(args.data[key]),
            innflyttet: new Date().toISOString().split("T")[0],
            utflyttet: null,
          });
        } else {
          data[key] = args.data[key];
        }
      }

      // Sjekker om det er en beboer som allerede bruker den samme mailen:
      const beboer = await context.prisma.beboer.findFirst({
        where: {
          epost: data.epost,
        },
        select: {
          id: true,
        },
      });

      if (beboer) {
        return Error(
          "Det er allerede en beboer med denne eposten! Husk også å sjekke gamle beboer-listen"
        );
      }

      // Generer tilfeldig passord:
      const karakterer =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#@!%&()/";
      let randPwLen =
        Math.floor(Math.random() * (MAX_LENGDE - MIN_LENGDE + 1)) + MIN_LENGDE;
      const randPassword = Array(randPwLen)
        .fill(karakterer)
        .map(function (x) {
          return x[Math.floor(Math.random() * x.length)];
        })
        .join("");

      // Genererer en hash av passordet:
      const hash = await bcrypt
        .genSalt(SALT_ROUNDS)
        .then((salt) => {
          return bcrypt.hash(randPassword, salt);
        })
        .catch((err) => {
          throw err;
        });

      // Lager en bruker med hashen:
      const bruker = await context.prisma.bruker.create({
        data: {
          salt: hash.slice(0, 29),
          passord: hash,
          dato: "",
          glemt_token: "",
        },
      });

      // Lager beboeren:
      const nyBeboer = await context.prisma.beboer.create({
        data: {
          ...data,
          romhistorikk: JSON.stringify(romhistorikk),
          bruker_id: bruker.id,
        },
        include: {
          rolle: true,
          studie: true,
          skole: true,
          bruker: true,
          rom: {
            include: {
              romtype: true,
            },
          },
          beboer_verv: {
            include: {
              verv: true,
            },
          },
        },
      });

      return formaterBeboer(context, nyBeboer);
    } catch (err) {
      throw err;
    }
  },
  // Ikke bruk denne til å flytte ut beboere
  // denne er kun til bruk ved evt feil eller hvis noen ber om å få dataen sin slettet:
  slettBeboer: async (parent, args, context) => {
    try {
      const beboer = await context.prisma.beboer.findUnique({
        where: {
          id: args.id,
        },
        select: {
          bruker: {
            select: {
              id: true,
            },
          },
        },
      });

      const brukerId = beboer.bruker.id;

      const deleteVaktAntall = await context.prisma.vaktantall.deleteMany({
        where: {
          bruker_id: brukerId,
        },
      });

      const deleteVakt = await context.prisma.vakt.deleteMany({
        where: {
          bruker_id: brukerId,
        },
      });

      const deleteArbeid = await context.prisma.arbeid.deleteMany({
        where: {
          bruker_id: brukerId,
        },
      });

      const deleteBeboerVerv = await context.prisma.beboer_verv.deleteMany({
        where: {
          beboer: {
            id: args.id,
          },
        },
      });

      const deleteKrysseliste = await context.prisma.krysseliste.deleteMany({
        where: {
          beboer_id: args.id,
        },
      });

      const deleteKunngjoring = await context.prisma.kunngjoring.deleteMany({
        where: {
          beboer_id: args.id,
        },
      });

      const deleteStorhybelRekkefølge = await context.prisma.storhybel_rekkefolge.deleteMany(
        {
          where: {
            storhybel_velger: {
              beboer_id: args.id,
            },
          },
        }
      );

      const deleteStorhybelFordeling = await context.prisma.storhybel_fordeling.deleteMany(
        {
          where: {
            storhybel_velger: {
              beboer_id: args.id,
            },
          },
        }
      );

      const deleteStorhybelVelger = await context.prisma.storhybel_velger.deleteMany(
        {
          where: {
            beboer_id: args.id,
          },
        }
      );

      const deleteBeboer = await context.prisma.beboer.delete({
        where: {
          id: args.id,
        },
      });

      const deleteBruker = await context.prisma.bruker.delete({
        where: {
          id: brukerId,
        },
      });

      return formaterBeboer(context, deleteBeboer);
    } catch (err) {
      throw err;
    }
  },

  oppdaterAnsiennitet: async (parent, args, context) => {
    try {
      let beboere = [];

      for (let i = 0; i < args.data.length; i++) {
        const beboer = await context.prisma.beboer.update({
          where: {
            id: args.data[i].beboerId,
          },
          data: {
            ansiennitet: args.data[i].ansiennitet,
          },
          include: {
            rolle: true,
            studie: true,
            skole: true,
            bruker: true,
            rom: {
              include: {
                romtype: true,
              },
            },
            beboer_verv: {
              include: {
                verv: true,
              },
            },
          },
        });
        beboere.push(formaterBeboer(context, beboer));
      }

      return beboere;
    } catch (err) {
      throw err;
    }
  },
  oppdaterBeboer: async (parent, args, context) => {
    try {
      const beboer = await context.prisma.beboer.update({
        where: { id: args.id },
        data: {
          fornavn: args.info.fornavn,
          mellomnavn: args.info.mellomnavn,
          etternavn: args.info.etternavn,
          adresse: args.info.adresse,
          postnummer: args.info.postnummer,
          epost: args.info.epost,
          telefon: args.info.telefon,
          klassetrinn: args.info.klassetrinn,
          fodselsdato: args.info.fodselsdato,
          kundenr: args.info.kundenr,
          studie: {
            connect: {
              id: args.info.studie_id,
            },
          },
          skole: {
            connect: {
              id: args.info.skole_id,
            },
          },
        },
        include: {
          rolle: true,
          studie: true,
          skole: true,
          bruker: true,
          rom: {
            include: {
              romtype: true,
            },
          },
          beboer_verv: {
            include: {
              verv: true,
            },
          },
        },
      });

      return formaterBeboer(context, beboer);
    } catch (err) {
      throw err;
    }
  },
  oppdaterPermStatus: async (parent, args, context) => {
    try {
      const beboer = await context.prisma.beboer.update({
        where: {
          id: args.id,
        },
        data: {
          perm: args.perm,
        },
        include: {
          rolle: true,
          studie: true,
          skole: true,
          bruker: true,
          rom: {
            include: {
              romtype: true,
            },
          },
          beboer_verv: {
            include: {
              verv: true,
            },
          },
        },
      });

      return formaterBeboer(context, beboer);
    } catch (err) {
      throw err;
    }
  },

  oppdaterBeboerAdmin: async (parent, args, context) => {
    try {
      const beboerRomhistorikk = await context.prisma.beboer.findUnique({
        where: {
          id: args.id,
        },
        select: {
          romhistorikk: true,
        },
      });

      // Romhistorikk er en string som vi gjør om til en array av objekter:
      let beboerRom = JSON.parse(beboerRomhistorikk.romhistorikk);

      // Endrer siste instans til å være det nye rommet:
      if (beboerRom.length > 0) {
        beboerRom[beboerRom.length - 1] = {
          ...beboerRom[beboerRom.length - 1],
          romId: String(args.romId),
        };
      } else {
        return Error("Beboer har ingen romhistorikk");
      }

      const beboer = await context.prisma.beboer.update({
        where: {
          id: args.id,
        },
        data: {
          alkoholdepositum: args.depositum,
          romhistorikk: JSON.stringify(beboerRom),
          rolle_id: args.rolleId,
          kundenr: args.kundenr,
        },
        include: {
          rolle: true,
          studie: true,
          skole: true,
          bruker: true,
          rom: {
            include: {
              romtype: true,
            },
          },
          beboer_verv: {
            include: {
              verv: true,
            },
          },
        },
      });

      return formaterBeboer(context, beboer);
    } catch (err) {
      throw err;
    }
  },
  oppdaterPrefs: async (parent, args, context) => {
    try {
      return await context.prisma.prefs.update({
        where: {
          beboerId: args.id,
        },
        data: {
          pinboo: args.prefs.pinboo,
          pinkode: args.prefs.pinkode,
          resepp: args.prefs.resepp,
          vinkjeller: args.prefs.vinkjeller,
          vinpin: args.prefs.vinpin,
        },
      });
    } catch (err) {
      throw err;
    }
  },
  oppdaterEpostPrefs: async (parent, args, context) => {
    try {
      return await context.prisma.epost_pref.update({
        where: {
          beboer_id: args.id,
        },
        data: {
          tildelt: args.prefs.tildelt,
          snart_vakt: args.prefs.snartVakt,
          bytte: args.prefs.bytte,
          utleie: args.prefs.utleie,
          barvakt: args.prefs.barvakt,
        },
      });
    } catch (err) {
      throw err;
    }
  },
};

module.exports = { beboerQuery, beboerMutation };