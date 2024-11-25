import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin } from '../../types';

// Constructing interfaces and types

interface Wavelength {
    id: string | number;
    series: {
        wavelength: number;
        intensity: number;
    }[];
}

export default function WavelengthPlot({theme}) {
    
    // Initialize use states
    const [wavelengthData, setWavelength] = useState<Wavelength[]>([]);
    const wavelengthRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    const margin: Margin = { top: 50, right: 100, bottom: 100, left: 100 };
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200)

    useResizeObserver({ ref: wavelengthRef, onResize });
    
    // Set background color to match theme 
    useEffect(() => {
        if (wavelengthRef.current) {
        wavelengthRef.current.style.backgroundColor = theme.palette.background.default;
        }
    }, [theme]);

    // Read from CSV file
    useEffect(() => {
        const dataFromCSV = async () => {
          try {
            const csvData = await d3.csv('../../data/combined_spectra_data.csv', d => ({
                id: d.Id,
                wavelength: +d.Wavelength,
                intensity: +d.Intensity,
            }));

            // Group wavelengths per patient
            const groupedData = d3.group(csvData, d => d.id);
            const processedData = Array.from(groupedData, ([id, values]) => ({
                id,
                series: values.map(v => ({ wavelength: v.wavelength, intensity: v.intensity })),
            }));

            setWavelength(processedData);

          } catch (error) {
            console.error('Error loading CSV:', error);
          }
        } 
        dataFromCSV();
    }, [])

    console.log(wavelengthData)

    // Refreshing page
    useEffect(() => {
        if (isEmpty(wavelengthData)) return;
        if (size.width === 0 || size.height === 0) return;
        d3.select('#wavelength-svg').selectAll('*').remove();
        initWavelength();
    }, [wavelengthData, size])

    // Initialize wavelength series plot
    function initWavelength() {

        // Initialize dimensions of plot by removing margins
        const width = size.width - margin.left - margin.right;
        const height = size.height - margin.top - margin.bottom;

        // Append SVG to HTML element
        let wavelengthContainer = d3.select('#wavelength-svg')
        let svg = wavelengthContainer.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

        // Initialize color scale
        const color = d3.scaleOrdinal(["#4A90E2", "#6C63FF", "#7B2CBF", "#9B5DE5", "#C084FC", "#FF89BB", "#FF5D8F", "#FF2E63", "#D72638", "#851DE0"] );

        // Calculate min and max for x and y
        const xMin = d3.min(wavelengthData, d => d3.min(d.series, p => p.wavelength)) || 0;
        const xMax = d3.max(wavelengthData, d => d3.max(d.series, p => p.wavelength)) || 0;
        const yMin = d3.min(wavelengthData, d => d3.min(d.series, p => p.intensity)) || 0;
        const yMax = d3.max(wavelengthData, d => d3.max(d.series, p => p.intensity)) || 0;
        
        // Create scales
        const xScale = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([0, width ]);

        const yScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([height, 0]);

        // Create wavelength line generator
        const lineGenerator = d3.line<{ wavelength: number; intensity: number }>()
            .x(d => xScale(d.wavelength))
            .y(d => yScale(d.intensity));

        // Create axes
        const xAxis = svg.append("g")
            .call(d3.axisBottom(xScale))
            .attr('transform', `translate(0,${height})`)
            .attr('class', 'x-axis')
            .attr('stroke', 'white')

        const yAxis = svg.append("g")
            .call(d3.axisLeft(yScale))
            .attr('class', 'y-axis')
            .attr('stroke', 'white')

        // Add wavelength lines for each patient
        const wavelengthLines = svg.selectAll('.line')
            .data(wavelengthData)
            .join('path')
            .attr('class', 'line')
            .attr('d', d => lineGenerator(d.series)!)
            .attr('fill', 'none')
            .attr('stroke', (d, i) => color.range()[i % 9])
            .attr('stroke-width', 1.5);

        // Add axis titles
        const xAxisTitle = svg.append("g")
            .append("text")
            .text("Wavelength (nm)")
            .attr('transform', `translate(${(width - margin.left) / 2}, ${height + margin.top})`)
            .style('font-size', '.8rem')
            .style("fill", theme.palette.text.primary);

        const yAxisTitle = svg.append("g")
            .append("text")
            .text("Intensity")
            .attr('transform', `translate(${-margin.left / 2}, ${(height + margin.top) / 2}) rotate(-90)`)
            .style('font-size', '.8rem')
            .style("fill", theme.palette.text.primary);
    }

    return (
        <>
            <div ref={wavelengthRef} className='chart-container'>
                <svg id='wavelength-svg' width='100%' height='100%'></svg>
            </div>
        </>
    );
}