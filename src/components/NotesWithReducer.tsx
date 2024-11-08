import React from 'react'
import { Paper, Divider, Button } from '@mui/material';
import { createContext, useContext, useReducer, ReactNode } from 'react';
import { reducer, ACTIONS, State, Action } from '../stores/Reducer';

const CountContext = createContext<{ state: State, dispatch: React.Dispatch<Action> } | undefined>(undefined);

// Create provider component
export function CountProvider({ children }: {children: ReactNode}){
    const [state, dispatch] = useReducer(reducer, { count: 0 });
  
    return (
      <CountContext.Provider value={{ state, dispatch }}>
        {children}
      </CountContext.Provider>
    );
};

// after the colon is the typing, before is how props are passed
export function NotesWithReducer({ msg }: { msg: string }) {
    const click = useContext(CountContext);
    
    if (!click) throw new Error('Counter must be used within a CountProvider');

    const { state, dispatch } = click;

  return (
    <>
      <Paper elevation={1} style={{padding: '1rem'}}>
        <h3>{msg}</h3>
        <Divider />
        <p>
         Edit <code>src/components/Notes.tsx</code> to try different UI components from Material UI. 
        </p>
        <p>
          This template uses Material UI, a UI library based on Google's Material Design that can help you design the layout and populate template components in a consistent style.<br />
        </p>
        <Button variant='contained' onClick={() => dispatch({type: ACTIONS.INCREMENT})}>Have clicked this {state.count} times</Button>
      </Paper>
    </>
  )
}
