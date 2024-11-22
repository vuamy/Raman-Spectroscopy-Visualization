import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin } from '../../types';

// Constructing interfaces and types

interface Wavelength {
    id: string | number,
    wavelength: number,
    intensity: number
}

export default function WavelengthPlot({theme}) {
    
    // Initialize use states
    const [wavelengthData, setWavelength] = useState<Wavelength>();
    const wavelengthRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    const margin: Margin = { top: 50, right: 100, bottom: 50, left: 100 };
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200)

    useResizeObserver({ ref: wavelengthRef, onResize });
    
    // Set background color to match theme 
    useEffect(() => {
        if (wavelengthRef.current) {
        wavelengthRef.current.style.backgroundColor = theme.palette.background.default;
        }
    }, [theme]);

    return (
        <>
        </>
    );
}