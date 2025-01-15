import React, { useState } from 'react';
import ScatterPlot from './components/Visualizations/ScatterPlot'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import Grid from '@mui/material/Grid';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';

// Adjust the color theme for material ui
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#9d5fde',
    },
    secondary: {
      main: '#4e4de0',
    },
    background: {
      default: '#1C1C1E',
      paper: '#1F2933',
    },
  },
})

// For how Grid works, refer to https://mui.com/material-ui/react-grid/

function Layout() {
  const theme = useTheme();

  return (
    <div>
      <Navbar />
      <Grid container spacing={1} direction='column' id="main-container">
        <ScatterPlot/>
      </Grid>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  )
}

export default App
