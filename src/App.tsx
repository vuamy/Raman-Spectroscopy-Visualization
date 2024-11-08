import Example from './components/Example'
import Notes from './components/Notes'
import { NotesWithReducer, CountProvider } from './components/NotesWithReducer';
import Grid from '@mui/material/Grid';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { grey } from '@mui/material/colors';

// Adjust the color theme for material ui
const theme = createTheme({
  palette: {
    primary:{
      main: grey[700],
    },
    secondary:{
      main: grey[700],
    }
  },
})

// For how Grid works, refer to https://mui.com/material-ui/react-grid/

function Layout() {
  return (
    <Grid container spacing={1} direction='column' id="main-container">
      <Grid container item xs={6} sm={6} md={6} lg={6}>
        <Grid item xs={5} sm={5} md={5} lg={5}>
          <Example />
        </Grid>
        <Grid item xs sm md lg/>
      </Grid>
      <Grid item xs sm md lg>
        {
        <Notes msg={"This is a message sent from App.tsx as component prop"} />
        }
        { // Uncomment the following to see how state management works in React.
        /*
          <CountProvider>
            <NotesWithReducer msg={"This is a message sent from App.tsx as component prop"} />
          </CountProvider>*/
        }
      </Grid>
    </Grid>
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
