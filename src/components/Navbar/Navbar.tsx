import React from 'react'
import { Paper } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDisease } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import HelpIcon from '@mui/icons-material/Help';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';


export default function Navbar() {
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    return(
        <Paper>
            <div className='navbar-container'>
                <div className='navitem-container'>
                    <h3 className='navbar-title'>Raman Spectroscopy Visualization Dashboard</h3>
                </div>
                <Tooltip title="Help" style={{ height: '100%' }}>
                    <IconButton onClick={handleOpen}>
                        <HelpIcon />
                    </IconButton>
                </Tooltip>
                <Modal
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                >
                    <Box sx={{ position: 'absolute', top: '3rem', right: '3rem'}}>
                        <Typography id="modal-modal-title" variant="h6" component="h2">
                            Interactive Visualization
                        </Typography>
                        <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                            Try clicking around on the graphs to learn more about the dataset!
                        </Typography>
                    </Box>
                </Modal>
            </div>
        </Paper>
    )
}