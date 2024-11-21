import SankeyPlot from './components/Visualizations/SankeyPlot'
import Notes from './components/Notes'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import { NotesWithReducer, CountProvider } from './components/NotesWithReducer';
import Grid from '@mui/material/Grid';
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import { grey } from '@mui/material/colors';

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
      paper: '#1f1d20',
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
        <Grid container item xs={6} sm={6} md={6} lg={6} sx={{ height: '100%' }}>
            <Grid item xs={12} className="plot" sx={{ height: '100%' }}>
              <div style={{ width: '100%', height: '100%'}}> 
                <SankeyPlot theme={theme} />
              </div>
            </Grid>
          </Grid>
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
