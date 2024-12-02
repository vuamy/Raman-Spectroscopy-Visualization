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

export default function Heatmap({ theme }) {
    
    // Initialize use states
    const [heatmapData, setHeatmap] = useState<Wavelength[]>([]);
    const heatmapRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    const margin: Margin = { top: 50, right: 50, bottom: 50, left: 50 };
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
            const sampleSize = 50;
            const subset = processedData.slice(0, sampleSize);
            setHeatmap(processedData); // Update with only subset of data
        };
    
        loadData();
    }, []);

    // Refreshing page
    useEffect(() => {
        if (isEmpty(heatmapData)) return;
        if (size.width === 0 || size.height === 0) return;
        d3.select('#heatmap-svg').selectAll('*').remove();
        initHeatmap();
    }, [heatmapData, size])

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
                .attr("transform", "translate(" + (width/2 + 40) + "," + (height/2 + 40) + ")");

        // Initialize color scale
        const min = d3.min(heatmapData, d => d3.min(d.series, p => p.intensity)) || 0;
        const max = d3.max(heatmapData, d => d3.max(d.series, p => p.intensity)) || 0;
        const colorScale = d3.scaleSequential<String>()
            .domain([min, max])
            .range(["white", "#7B2CBF"])
        
        // Create line angle scale
        const angleScale = d3.scaleLinear()
            .domain([1, 4])
            .range([0, 2 * Math.PI]);
        
        // Create ring radial scale
        const radialScale = d3.scaleLinear()
            .domain([1, 25]) // Symmetry for same ring
            .range([0, radius]);

        // Function to consider that opposite rings are the same
        const normalizedRing = ring => Math.min(ring, 51 - ring);

        // Function to find matching intesity for some wavelength
        const filterDataByWavelength = (data: Wavelength[], targetWavelength: number) => {
            return data.map(d => {
              const matchingEntry = d.series.find(s => s.wavelength === targetWavelength);
              return matchingEntry
                ? {
                    line: Number(d.line), 
                    ring: Number(d.ring),
                    intensity: matchingEntry.intensity
                  }
                : null; // Exclude entries without matching wavelengths
            }).filter(d => d !== null);
          };

        // Grab necessary data
        const filteredData = filterDataByWavelength(heatmapData, 793.398);
        svg.selectAll("path")
          .data(filteredData) // Use the flattened data array
          .join("path")
          .attr("d", d => {
            const startAngle = angleScale(d.line);
            const endAngle = angleScale(d.line + 1); // Adjust for discrete segments
            const innerRadius = radialScale(normalizedRing(d.ring));
            const outerRadius = radialScale(normalizedRing(d.ring) + 1);
        
            const arc = d3.arc()
              .innerRadius(innerRadius)
              .outerRadius(outerRadius)
              .startAngle(startAngle)
              .endAngle(endAngle);
        
            return arc();
          })
          .attr("fill", d => colorScale(d.intensity))
          .attr("stroke", "white")
          .attr("stroke-width", 0.5);

        }

    return (
        <>
            <div ref={heatmapRef} className='chart-container'>
                <svg id='heatmap-svg' width='100%' height='100%'></svg>
            </div>
        </>
    );
}