"use client";

import { Container, CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    primary: {
      main: '#4facfe',
    },
    secondary: {
      main: '#667eea',
    },
    background: {
      default: '#f5f7fa',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Voice to Text - AI Speech Recognition</title>
        <meta name="description" content="Convert speech to text with AI-powered voice recognition" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Container maxWidth="100%" disableGutters>
            {children}
          </Container>
        </ThemeProvider>
      </body>
    </html>
  );
}