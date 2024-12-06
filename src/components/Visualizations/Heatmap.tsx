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
    patient: string;
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
    setSelectedLineRing: ({line: number; ring: number} | null);
    theme: any;
}

export default function Heatmap({ theme, selectedWavelength, selectedPatientId, setSelectedLineRing }: InputProps) {
    
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
                .attr("transform", "translate(" + (width/2 - 50) + "," + (height/2 + 70) + ")");

        // Function to find matching intensity for selected patient
        const filterDataByPatient = (data: Wavelength[], targetPatient:string) => {
            return data.filter(d => d.patient === targetPatient)
        }

        // Function to find matching intesity for some wavelength
        const filterDataByWavelength = (data: Wavelength[], targetWavelength: number) => {
            return data.map(d => {
              const matchingEntry = d.series.find(s => s.wavelength < targetWavelength && s.wavelength + 0.119 > targetWavelength);
              return matchingEntry
                ? ((Number(d.ring) <= 25) ? {
                    patient: d.patient,
                    line: Number(d.line), 
                    ring: Number(d.ring),
                    intensity: matchingEntry.intensity
                  } : {
                    patient: d.patient,
                    line: 4 + Number(d.line), 
                    ring: 51 - Number(d.ring),
                    intensity: matchingEntry.intensity}
                ) : null; // Exclude entries without matching wavelengths
            }).filter(d => d !== null);
          };

        // First filter by patient
        const filteredByPatient = filterDataByPatient(heatmapData, selectedPatientId ?? '');
        
        // Initialize min and max of patient
        const allIntensities = filteredByPatient.flatMap(d => d.series.map(s => s.intensity));
        const minIntensity = d3.min(allIntensities) ?? 0;
        const maxIntensity = d3.max(allIntensities) ?? 0;
        const clippedMax = d3.quantile(allIntensities.sort(d3.ascending), 0.95) ?? maxIntensity;

        // Filter by wavelength
        const filteredData = filterDataByWavelength(filteredByPatient, 
            typeof selectedWavelength === 'number' ? selectedWavelength : 0);

        // Create color scale
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([minIntensity, clippedMax]);
        
        // Create line angle scale
        const angleScale = d3.scaleBand()
            .domain([1, 2, 3, 4, 5, 6, 7, 8])
            .range([0, 2 * Math.PI])
            .padding(0);

        // Create each individual segment
        const segmentAngle = (2 * Math.PI) / 8;

        // Create ring radial scale
        const radialScale = d3.scaleLinear()
            .domain([25, 1])
            .range([radius/3, radius])

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
            .attr("fill", d => colorScale(d.intensity))
            .attr("stroke", "black")
            .on("mouseover", function (event, d) {
                // Show tooltip and update its content
                tooltip.style("visibility", "visible");
                const tooltipContent = `Line: ${d.line < 5 ? d.line : d.line - 4}, Ring: ${d.line < 5 ? d.ring : 51 - d.ring}, Intensity: ${d.intensity.toFixed(1)}`;
                tooltipText.text(tooltipContent);
                d.line < 5 ? setSelectedLineRing({ line: d.line, ring: d.ring }) : setSelectedLineRing({line: d.line - 4, ring: 51-d.ring});
        
                // Get the bounding box of the text for the rectangle
                const bbox = tooltipText.node().getBBox();
                tooltipRect
                    .attr("width", bbox.width + 10)
                    .attr("height", bbox.height + 5)
                    .attr("x", bbox.x - 5)
                    .attr("y", bbox.y - 2.5);
            })
            .on("mousemove", function (event) {
                // Update tooltip position
                const [x, y] = d3.pointer(event, svg.node());
                tooltip.attr("transform", `translate(${x + 10}, ${y - 20})`);
            })
            .on("mouseout", function () {
                // Hide tooltip when the mouse leaves
                tooltip.style("visibility", "hidden");
                setSelectedLineRing(null);
            });

        // Add label for each line
        svg.selectAll(".line-label")
            .data([1, 2, 3, 4, 5, 6, 7, 8]) // Assuming 4 lines
            .join("text")
            .attr("class", "line-label")
            .attr("x", d => (radius + 30) * Math.cos((angleScale(d) + 0.4) - Math.PI / 2))
            .attr("y", d => (radius + 18) * Math.sin((angleScale(d) + 0.4) - Math.PI / 2))
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .attr("fill", "white")
            .text(d => d < 5 ? `Line ${d}` : `Line ${d - 4}`)

        // Add plot title
        const plotTitle = svg.append("g")
            .append("text")
            .text("Spatial Variance of Selected Patient at Selected Wavelength")
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .attr("y", -160)
            .attr("x", -150)

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

        // Create tooltip for hovering on points
        const tooltip = svg
            .append("g")
            .attr("id", "tooltip")
            .style("pointer-events", "none")
            .style("visibility", "hidden");

        // Add a background rectangle for the tooltip
        const tooltipRect = tooltip
            .append("rect")
            .attr("fill", "rgba(0, 0, 0, 0.8)")
            .attr("rx", 4)
            .attr("ry", 4)

        // Add text to the tooltip
        const tooltipText = tooltip
            .append("text")
            .attr("fill", "white")
            .attr("x", 10)
            .attr("y", 20)
            .attr("padding", 0)
            .style("font-size", "10px")
            .style("font-family", "Arial, sans-serif");

        // Find minimum and maximum at wavelength
        const allIntensitiesAtWavelength = filteredData.flatMap(d => d.intensity);
        const minIntensityAtWavelength = d3.min(allIntensitiesAtWavelength) ?? 0;
        const maxIntensityAtWavelength = d3.max(allIntensitiesAtWavelength) ?? 0;

        // Append a defs element to hold the gradient
        const defs = svg.append("defs");

        // Define the vertical linear gradient
        const gradient = defs.append("linearGradient")
            .attr("id", "heatmap-gradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");

        // Choose values of gradient
        const numStops = 10;
        const step = (maxIntensity - minIntensity) / (numStops - 1);
        const intensityRange = d3.range(minIntensity, maxIntensity + step, step);

        intensityRange.forEach((intensity, i) => {
            gradient.append("stop")
                .attr("offset", `${(i / (numStops - 1)) * 100}%`)
                .attr("stop-color", colorScale(intensity));
        });

        // Add a gradient rectangle
        svg.append("rect")
            .attr("x", 210)
            .attr("y", -40)
            .attr("width", 20)
            .attr("height", 150)
            .style("fill", "url(#heatmap-gradient)");

        // Add axis to indicate values
        const yScale = d3.scaleLinear()
            .domain([maxIntensity, minIntensity])
            .range([-40, 110]);

        const axisRight = d3.axisRight(yScale)
            .ticks(5)

        const axisGroup = svg.append("g")
            .attr("transform", "translate(230, 0)") // Position to the right of the rectangle
            .call(axisRight);

        // Smaller font size
        axisGroup.selectAll(".tick text")
            .style("font-size", "8px")

        // Display minimum and maximum values
        const minIntensityDisplay = svg.append("g")
            .append("text")
            .text(minIntensity.toFixed(2))
            .attr('fill', 'white')
            .attr('text-anchor', 'center')
            .attr('y', 130)
            .attr('x', 205)
            .attr("font-size", "12px")

        const maxIntensityDisplay = svg.append("g")
            .append("text")
            .text(maxIntensity.toFixed(2))
            .attr('fill', 'white')
            .attr('text-anchor', 'center')
            .attr('y', -50 )
            .attr('x', 205)
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