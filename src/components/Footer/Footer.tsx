import React from 'react'
import { Paper } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from '@mui/material/Link';
import AttachmentIcon from '@mui/icons-material/Attachment';

export default function Footer() {
    const hover = {
        color: 'primary.main',
        transition: 'color 0.3s ease',
        '&:hover': {
          color: 'primary.light',
        },
    }

    return(
        <Paper>
            <div className='footer-container'>
                <div className='footer-item'>
                    <div className='text-with-icon'>
                        <img src='../../../public/img/ucdavislogo.png' alt="uc davis logo" style={{ width: '70px'}}></img>
                        <h3 style={{ margin: 0}}>University of California, Davis</h3>
                    </div>
                </div>
                <div className='footer-item'>
                <p style={{ margin: 0}}>Created by 
                        <Link href="https://github.com/vuamy"
                        target="_blank"
                        underline="none"
                        sx={hover}>
                        {' Amy Vu'}
                        </Link> and <Link href="https://github.com/y222gu"
                        target="_blank"
                        underline="none"
                        sx={hover}>
                        {' Yifei Gu'}
                    </Link></p>
                    <p className='text-with-icon'>
                    <AttachmentIcon/>
                    <Link href="https://github.com/vuamy/Raman-Spectroscopy-Visualization"
                    target="_blank"
                    underline="none"
                    sx={hover}>
                        {'Github Repository'}
                    </Link></p>
                </div>
            </div>
        </Paper>
    )
}