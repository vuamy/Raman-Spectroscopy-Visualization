import React from 'react'
import { Paper, Divider, Button } from '@mui/material';
import { useState } from 'react';

// after the colon is the typing, before is how props are passed
export default function Notes({ msg }: { msg: string }) {
  const [click, setClick] = useState(0);

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
        <Button variant='contained' onClick={() => setClick(click + 1)}>Have clicked this {click} times</Button>
      </Paper>
    </>
  )
}
