import React, { useEffect, useState } from "react";

import Layout from "../../../../components/Layout";
import NyBeboerInput from "../../../../components/utvalget/romsjef/soknad/NyBeboerInput";
import NyBeboerSoknad from "../../../../components/utvalget/romsjef/soknad/NyBeboerSoknad";

import { useRouter } from "next/router";
import Head from "next/head";
import { useSelector, useDispatch } from "react-redux";
import { useLazyQuery } from "@apollo/react-hooks";
import { GET_SOKNAD } from "../../../../src/query/soknad";
import { getSoknad } from "../../../../src/actions/soknad";

// Material-UI
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Breadcrumbs from "@material-ui/core/Breadcrumbs";
import Link from "@material-ui/core/Link";
import KeyboardBackspaceIcon from "@material-ui/icons/KeyboardBackspace";

const NyBeboer = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = router.query;
  const soknader = useSelector((state) => state.soknader);

  const [soknadQuery, { loading, error }] = useLazyQuery(GET_SOKNAD, {
    onCompleted(data) {
      dispatch(getSoknad(data));
    },
    onError(error) {
      console.log(error.message);
    },
  });

  useEffect(() => {
    if (!soknader[params.sem] || !soknader[params.sem][params.params[0]]) {
      soknadQuery({
        variables: {
          id: Number(params.params[0]),
        },
      });
    }
  }, []);

  return (
    <Layout>
      <Head>
        <title>Ny beboer | Internsida</title>
      </Head>
      <Grid container direction="column" spacing={2}>
        <Grid item>
          <Breadcrumbs aria-label="breadcrumb">
            <Link
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/utvalget/romsjef/soknader")}
            >
              <KeyboardBackspaceIcon />
              Tilbake
            </Link>
          </Breadcrumbs>
        </Grid>
        <Grid item container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper
              variant="elevation"
              elevation={8}
              style={{
                maxHeight: "800px",
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              <NyBeboerInput />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              variant="elevation"
              elevation={8}
              style={{
                maxHeight: "800px",
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              <NyBeboerSoknad />
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default NyBeboer;