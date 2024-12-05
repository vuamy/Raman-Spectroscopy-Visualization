import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { sliderBottom } from 'd3-simple-slider';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin } from '../../types';
import { processCSVData } from '../../api/handleSpectrumData.tsx';
import simplify from 'simplify-js'

// Constructing interfaces and types

interface Wavelength {
    id: string | number;
    patient: string;
    series: {
        wavelength: number;
        intensity: number;
    }[];
}

interface InputProps {
    setSelectedWavelength?: (color: number | null) => void;
    selectedPatientId?: (color: string | null) => void;
    theme: any;
}

export default function WavelengthPlot({theme, setSelectedWavelength, selectedPatientId}:  InputProps) {
    
    // Initialize use states
    const [wavelengthData, setWavelength] = useState<Wavelength[]>([]);
    const wavelengthRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    const margin: Margin = { top: 20, right: 20, bottom: 100, left: 100 };
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200)

    useResizeObserver({ ref: wavelengthRef, onResize });
    
    // Set background color to match theme 
    useEffect(() => {
        if (wavelengthRef.current) {
        wavelengthRef.current.style.backgroundColor = theme.palette.background.default;
        }
    }, [theme]);
    
    useEffect(() => {
        // Call the data processing function
        const loadData = async () => {
            try {
                const processedData = await processCSVData('../../data/combined_spectra_data.csv');
                setWavelength(processedData);
                console.log('processed data:',processedData)
            } catch (error) {
                console.error('Error in data loading and simplification:', error);
            }
          };
    
        loadData();
      }, []);

    // Refreshing page
    useEffect(() => {
        if (isEmpty(wavelengthData)) return;
        if (size.width === 0 || size.height === 0) return;
        const svg = d3.select('#wavelength-svg')
        svg.selectAll("*").remove();
        initWavelength();
    }, [wavelengthData, size, setSelectedWavelength, selectedPatientId])

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

        // Function to filter data based on patient
        const filterDataByPatient = (data: Wavelength[], targetPatient: string): Wavelength[] => {
            return data
                .filter(d => d.patient === targetPatient) // Keep only entries with the target patient
                .map(d => ({
                    id: d.id,
                    patient: d.patient,
                    series: d.series.map(point => ({
                        wavelength: point.wavelength,
                        intensity: point.intensity
                    })) 
                }));
        };
        console.log('Selected patient:', selectedPatientId)
        const filteredData = filterDataByPatient(wavelengthData, selectedPatientId);
        console.log('Filtered data:', filteredData)
        
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

        // Prevent wavelength lines from going outside bounds when slider range changes
        svg.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", width)
            .attr("height", height);

        const wavelengthGroup = svg.append("g")
            .attr("class", "wavelength-group")
            .attr("clip-path", "url(#clip)");

        // Add wavelength lines for each patient
        wavelengthGroup.selectAll('.wavelength-line')
            .data(filteredData)
            .join('path')
            .attr('class', 'wavelength-line')
            .attr('d', d => lineGenerator(d.series)!)
            .attr('fill', 'none')
            .attr('stroke', (d, i) => color.range()[i % 9])
            .attr('stroke-width', 1.5);

        // Add axis titles
        const xAxisTitle = svg.append("g")
            .append("text")
            .text("Wavelength (nm)")
            .attr('transform', `translate(${(-20)}, ${height + margin.bottom/2 - 10})`)
            .style('font-size', '.8rem')
            .style("fill", theme.palette.text.primary);

        const yAxisTitle = svg.append("g")
            .append("text")
            .text("Intensity")
            .attr('transform', `translate(${-margin.left / 2 + 5}, ${(height + margin.top) / 2}) rotate(-90)`)
            .style('font-size', '.8rem')
            .style("fill", theme.palette.text.primary);

        // Define wavelength slider
        const sliderScale = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([margin.left, width-margin.right])
            
        const slider = sliderBottom(sliderScale)
            .ticks(10)
            .default([xMin, xMax])
            .fill("#C084FC")
            .handle(d3.symbol().type(d3.symbolCircle).size(200)())
            .on('onchange', ([min, max]: [number, number]) => {
                xScale.domain([min, max]);
                svg.select('.x-axis').call(d3.axisBottom(xScale));
                
                // Update the lines without redrawing the whole plot
                wavelengthGroup.selectAll('.wavelength-line')
                    .transition()
                    .duration(500)
                    .attr('d', d => lineGenerator(d.series));  // Smooth transition
            })

        // Add to slider container
        const sliderContainer = svg.append("g")
            .attr("class", "slider")
            .attr('width', 400)
            .attr('height', 100)
            .append('g')
            .attr('transform', `translate(0,${height + margin.bottom - 65})`)
            .call(slider);

        // Change visual display of slider
        svg.selectAll('.slider .tick text')
            .style('font-size', '10px')
            .style('fill', 'white')
            .style('y', '-20px')
        
        svg.selectAll('.parameter-value text')
            .style('font-size', '12px')
            .style('fill', "#C084FC")

        // Add plot title
        const plotTitle = svg.append("g")
            .append("text")
            .text("Raman Spectra of Selected Patient")
            .attr('transform', `translate(${width/2 - margin.right},${0})`)
            .attr('fill', 'white')
            .attr('font-weight', 'bold')

        // Create tooltip for hovering over plot that shows coordinates
        const tooltip = d3.select("body")
            .append("div")
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.5)")
            .style("color", "white")
            .style("padding", "5px")
            .style("border-radius", "3px")
            .style("font-size", "10px")
            .style("display", "none");

        const hoverGroup = svg.append("g").attr("class", "hover-group");

        // Vertical and horizontal lines connecting to axis
        const verticalLine = hoverGroup.append("line")
            .attr("stroke", "lightgray")
            .style("opacity", 0);

        const horizontalLine = hoverGroup.append("line")
            .attr("stroke", "lightgray")
            .style("opacity", 0);

        const selectWavelength = svg.append("line")
            .attr("stroke", "lightblue")
            .attr("stroke-width", 3)
            .style("opacity", 0);
        
        const wavelengthText = svg.append("g")
            .append("text")
            .style('font-size', "12px")
            .style('fill', "lightblue")

        // Control mouse events with overlay    
        svg.append("rect")
            .attr("class", "hover-rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mouseover", () => {
            tooltip.style("display", "block");
            verticalLine.style("opacity", 0.2);
            horizontalLine.style("opacity", 0.2);
            })
            .on("mousemove", (event) => {
            const [mouseX, mouseY] = d3.pointer(event);

            // Change values depending on mouse location
            const xValue = xScale.invert(mouseX);
            const yValue = yScale.invert(mouseY);

            // Update tooltip
            tooltip
                .style("display", "block")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 10}px`)
                .html(`
                Wavelength: ${xValue.toFixed(0)}<br>
                Intensity: ${yValue.toFixed(0)}
                `);

            // Update vertical and horizontal lines
            verticalLine
                .attr("x1", mouseX)
                .attr("x2", mouseX)
                .attr("y1", 0)
                .attr("y2", height);

            horizontalLine
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", mouseY)
                .attr("y2", mouseY);
            })
            .on("mouseout", () => {
            tooltip.style("display", "none");
            verticalLine.style("opacity", 0);
            horizontalLine.style("opacity", 0);
            })
            .on("click", (event) => {
            const [mouseX] = d3.pointer(event);
            const xValue = xScale.invert(mouseX);
            selectWavelength.style("opacity", 1);
            selectWavelength
                .attr("x1", mouseX)
                .attr("x2", mouseX)
                .attr("y1", 0)
                .attr("y2", height);
            wavelengthText
                .text(xValue.toFixed(0))
                .attr('x', mouseX - 10)
                .attr('y', -10);

            tooltip.style("display", "none");

            setSelectedWavelength(xValue);
            });

    }

    return (
        <>
            <div ref={wavelengthRef} className='chart-container'>
                <svg id='wavelength-svg' width='100%' height='100%'></svg>
            </div>
        </>
    );
}