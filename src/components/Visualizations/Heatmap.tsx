import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin } from '../../types';
import { processCSVData } from '../../api/handleSpectrumData.tsx'

// Constructing interfaces and types

interface Wavelength {
    id: string | number;
    line: string | number;
    ring: string | number;
    series: {
        wavelength: number;
        intensity: number;
    }[];
}

interface InputProps {
    selectedWavelength?: (color: number | null) => void;
    selectedPatientId?: (color: string | null) => void;
    theme: any;
}

export default function Heatmap({ theme, selectedWavelength, selectedPatientId }: InputProps) {
    
    // Initialize use states
    const [heatmapData, setHeatmap] = useState<Wavelength[]>([]);
    const heatmapRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    const margin: Margin = { top: 50, right: 20, bottom: 50, left: 20 };
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200)

    useResizeObserver({ ref: heatmapRef, onResize });
    
    // Set background color to match theme 
    useEffect(() => {
        if (heatmapRef.current) {
        heatmapRef.current.style.backgroundColor = theme.palette.background.default;
        }
    }, [theme]);

    // Processing CSV data would be here, instead filler data
    useEffect(() => {
        // Call the data processing function
            const loadData = async () => {
            const processedData = await processCSVData('../../data/combined_spectra_data.csv');
            setHeatmap(processedData); // Update with only subset of data

            console.log(processedData)
        };
    
        loadData();
    }, []);

    // Refreshing page
    useEffect(() => {
        if (isEmpty(heatmapData)) return;
        if (size.width === 0 || size.height === 0) return;
        d3.select('#heatmap-svg').selectAll('*').remove();
        initHeatmap();
    }, [heatmapData, size, selectedWavelength, selectedPatientId])

    // Initialize heatmap
    function initHeatmap() {

        // Initialize dimensions of plot by removing margins
        const width = size.width - margin.left - margin.right;
        const height = size.height - margin.top - margin.bottom;

        // For circular heatmap, calculate radius
        const radius = Math.min(width, height) / 2;

        // Append SVG to HTML element
        let heatmapContainer = d3.select('#heatmap-svg')
        let svg = heatmapContainer.append("svg")
            .attr("width", size.width)
            .attr("height", size.height)
            .append("g")
                .attr("transform", "translate(" + (width/2 - 50) + "," + (height/2 + 60) + ")");

        // Function to find matching intesity for some wavelength
        const filterDataByWavelength = (data: Wavelength[], targetWavelength: number, targetPatient: string) => {
            return data.map(d => {
              const matchingEntry = d.series.find(s => s.wavelength < targetWavelength && s.wavelength + 0.119 > targetWavelength);
              return matchingEntry
                ? ((Number(d.ring) <= 25) ? {
                    patient: targetPatient,
                    line: Number(d.line), 
                    ring: Number(d.ring),
                    intensity: matchingEntry.intensity
                  } : {
                    patient: targetPatient,
                    line: 4 + Number(d.line), 
                    ring: 51 - Number(d.ring),
                    intensity: matchingEntry.intensity}
                ) : null; // Exclude entries without matching wavelengths
            }).filter(d => d !== null);
          };

        // Grab necessary data
        const filteredData = filterDataByWavelength(heatmapData, typeof selectedWavelength === 'number' ? selectedWavelength : 0, selectedPatientId ?? '');
        // Initialize color scale
        const min = d3.min(filteredData, d => d.intensity) ?? 0;
        const max = d3.max(filteredData, d => d.intensity) ?? 0;
        const clippedMax = d3.quantile(filteredData.map(d => d.intensity).sort(d3.ascending), 0.95) ?? 0;

        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([min, clippedMax]);
        
        // Create line angle scale
        const angleScale = d3.scaleBand()
            .domain([1, 2, 3, 4, 5, 6, 7, 8])
            .range([0, 2 * Math.PI])
            .padding(0);

        // Create each individual segment
        const segmentAngle = (2 * Math.PI) / 8;
        
        // Create ring radial scale
        const radialScale = d3.scaleLinear()
            .domain([1, 25])
            .range([0, radius])

            svg.selectAll("path")
            .data(filteredData)
            .join("path")
            .attr("d", d => {
                const startAngle = (d.line - 1) * segmentAngle;
                const endAngle = startAngle + segmentAngle;
                
                // Inner and outer radius
                const innerRadius = radialScale(d.ring);
                const outerRadius = radialScale(d.ring + 1);
                
                // Generate arc
                const arc = d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius)
                .startAngle(startAngle)
                .endAngle(endAngle);
                
                return arc();
            })
            .attr("fill", "none")
            .attr("stroke", "gray")
            .attr("stroke-width", 0.5)
            .style("opacity", 0.1);

            // Add label for each line
            svg.selectAll(".line-label")
            .data([1, 2, 3, 4, 5, 6, 7, 8]) // Assuming 4 lines
            .join("text")
            .attr("class", "line-label")
            .attr("x", d => (radius + 30) * Math.cos(angleScale(d) - Math.PI / 2))
            .attr("y", d => (radius + 18) * Math.sin(angleScale(d) - Math.PI / 2))
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .attr("fill", "white")
            .text(d => d < 4 ? `Line ${d}` : `Line ${d - 4}`);
        
            // Add circle data point for each measurement
            svg.selectAll(".data-point")
            .data(filteredData)
            .join("circle")
            .attr("class", "data-point")
            .attr("cx", d => radialScale(d.ring) * Math.cos(angleScale(d.line) - Math.PI / 2))
            .attr("cy", d => radialScale(d.ring) * Math.sin(angleScale(d.line) - Math.PI / 2))
            .attr("r", 3)
            .attr("fill", d => colorScale(d.intensity));

            // Add plot title
            const plotTitle = svg.append("g")
            .append("text")
            .text("Spatial Variance of Selected Patient at Selected Wavelength")
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .attr("y", -220)
            .attr("x", -220)

            // Display patient id number
            const patientIdDisplay = svg.append("g")
                .append("text")
                .text("Patient: " + selectedPatientId)
                .attr('fill', 'white')
                .attr('y', -100)
                .attr('x', 170)
                .attr("font-size", "12px")

            // Display wavelength value
            const wavelengthDisplay = svg.append("g")
                .append("text")
                .text("Wavelength: " + (Number(selectedWavelength) > 0 ? selectedWavelength.toFixed(2) : 0))
                .attr('fill', 'white')
                .attr('y', -80)
                .attr('x', 170)
                .attr("font-size", "12px")
        }

    return (
        <>
            <div ref={heatmapRef} className='chart-container'>
                <svg id='heatmap-svg' width='100%' height='100%'></svg>
            </div>
        </>
    );
}