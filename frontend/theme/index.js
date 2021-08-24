import { useMemo } from "react";
// material
import { CssBaseline } from "@material-ui/core";
import {
  ThemeProvider,
  createTheme,
  StyledEngineProvider,
} from "@material-ui/core/styles";
//
import shape from "./shape";
import palette from "./palette";
import typography from "./typography";
import GlobalStyles from "./globalStyles";
import componentsOverride from "./overrides";
import shadows, { customShadows } from "./shadows";

// ----------------------------------------------------------------------

export default function ThemeConfig({ children }) {
  const themeOptions = useMemo(
    () => ({
      palette,
      shape,
      typography,
      shadows,
      customShadows,
    }),
    []
  );

  const theme = createTheme(themeOptions);
  theme.components = componentsOverride(theme);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}