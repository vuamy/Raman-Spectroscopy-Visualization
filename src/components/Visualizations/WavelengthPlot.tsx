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
    line: number;
    ring: number;
    cancer: number;
    series: {
        wavelength: number;
        intensity: number;
    }[];
}

interface InputProps {
    setSelectedWavelength?: (color: number | null) => void;
    setSelectedPatientId?: ((id: string | null) => void) | null;
    selectedLineRing?: ({line: number; ring: number} | null);
    theme: any;
}

export default function WavelengthPlot({theme, setSelectedWavelength, setSelectedPatientId, selectedLineRing}:  InputProps) {
    
    // Initialize use states
    const [wavelengthData, setWavelength] = useState<Wavelength[]>([]);
    const wavelengthRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    const margin: Margin = { top: 40, right: 50, bottom: 100, left: 100 };
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200)
    const [currentPatient, setCurrentPatient] = useState(0 as number);


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
                const processedData = await processCSVData('/raman-deploy/data/combined_spectra_data.csv');
                setWavelength(processedData);
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
    }, [wavelengthData, size, setSelectedWavelength, setSelectedPatientId, selectedLineRing, currentPatient])

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
                    line: d.line,
                    ring: d.ring,
                    cancer: d.cancer,
                    series: d.series.map(point => ({
                        wavelength: point.wavelength,
                        intensity: point.intensity
                    })) 
                }));
        };

        // Function to get all existing patient ids and return an array
        const getAllPatientIds = (data: Wavelength[]): string[] => {
            const patientIds = Array.from(new Set(data.map(d => d.patient)));
            return patientIds;
        };
        
        // Filter data based on patient
        const allPatientIds = getAllPatientIds(wavelengthData);
        const patientNumber = allPatientIds[currentPatient]
        let filteredData = patientNumber && typeof patientNumber === 'string' ? filterDataByPatient(wavelengthData, patientNumber) : [];
        
        // Move to next patient
        const nextPatientButton = svg.append("foreignObject")
            .attr('width', 150)
            .attr('height', 30)
            .attr('transform', `translate(${width - 160},${-margin.top / 2 -15})`)
            .append("xhtml:button")
            .style('width', '150px')
            .style('height', '30px')
            .style('background-color', theme.palette.primary.main)
            .style('color', 'white')
            .style('border', 'none')
            .style('font-size', '18px')
            .style('cursor', 'pointer')
            .style('border-radius', '10px') // Add round corners
            .text("Next Patient")
            .on('click', () => {
            moveToNextPatient();
            });

        // Move to previous patient
        const prevPatientButton = svg.append("foreignObject")
            .attr('width', 150)
            .attr('height', 30)
            .attr('transform', `translate(${width -320},${-margin.top / 2 -15})`)
            .append("xhtml:button")
            .style('width', '150px')
            .style('height', '30px')
            .style('background-color', theme.palette.primary.main)
            .style('color', 'white')
            .style('border', 'none')
            .style('cursor', 'pointer')
            .style('font-size', '18px')
            .style('border-radius', '10px') // Add round corners
            .text("Previous Patient")
            .on('click', () => {
            moveToPrevPatient();
            });

        // Function to move to the next patient
        const moveToNextPatient = () => {
            // Get the next patient's ID
            const nextPatientIndex = (currentPatient + 1) % allPatientIds.length;
            setCurrentPatient(nextPatientIndex);
        }

        // Function to move to the previous patient
        const moveToPrevPatient = () => {
            // Get the previous patient's ID
            const prevPatientIndex = (currentPatient - 1 + allPatientIds.length) % allPatientIds.length;
            setCurrentPatient(prevPatientIndex);
        }

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
            .attr('transform', `translate(0,${height + 40})`)
            .attr('class', 'x-axis')
            .style('font-size', '18px');

        const yAxis = svg.append("g")
            .call(d3.axisLeft(yScale))
            .attr('class', 'y-axis')
            .attr('transform', `translate(0,40)`)
            .style('font-size', '18px');

        // // Prevent wavelength lines from going outside bounds when slider range changes
        // svg.append("defs")
        //     .append("clipPath")
        //     .attr("id", "clip")
        //     .append("rect")
        //     .attr("x", 0)
        //     .attr("y", 45)
        //     .attr("width", width)
        //     .attr("height", height);

        const wavelengthGroup = svg.append("g")
            .attr("class", "wavelength-group")
            .attr("clip-path", "url(#clip)")
            .attr("transform", `translate(0,45)`);

        // Add wavelength lines for each patient
        wavelengthGroup.selectAll('.wavelength-line')
            .data(filteredData)
            .join('path')
            .attr('class', 'wavelength-line')
            .attr('d', d => lineGenerator(d.series)!)
            .attr('fill', 'none')
            .attr('stroke', (d, i) => color.range()[i % 9])
            .attr('stroke-width', 1.5);
        
        if (selectedLineRing === null) {
            wavelengthGroup.selectAll('.wavelength-line')
            .attr('stroke', (d, i) => color.range()[i % 9])
            .attr('opacity', 1)
        } else {
            wavelengthGroup.selectAll('.wavelength-line')
            .attr('opacity', (d: Wavelength) => (d.line === selectedLineRing?.line && d.ring === selectedLineRing?.ring) ? 1 : 0)
        }

        // Add axis titles
        const xAxisTitle = svg.append("g")
            .append("text")
            .text("Wavelength (nm)")
            .attr('transform', `translate(${width / 2}, ${height + margin.bottom / 2 + 45})`)
            .style('text-anchor', 'middle')
            .style('font-size', '24px')
            .style("fill", theme.palette.text.primary);

        const yAxisTitle = svg.append("g")
            .append("text")
            .text("Normalized Intensity")
            .style('text-anchor', 'middle')
            .attr('transform', `translate(${-margin.left / 2 + 5}, ${(height + margin.top) / 2 + 40}) rotate(-90)`)
            .style('font-size', '24px')
            .style("fill", theme.palette.text.primary);


        // Add plot title
        const plotTitle = svg.append("g")
            .append("text")
            .text(`Raman Spectra of ${filteredData[0]?.cancer === 1 ? 'Healthy' : 'Cancer'} Patient #${patientNumber} `)
            .attr('transform', `translate(${width / 2},${-margin.top / 2  + 60})`)
            .attr('fill', 'white')
            .attr('font-weight', 'bold')
            .style('text-anchor', 'middle')
            .style('font-size', '30px');

        // Create tooltip for hovering over plot that shows coordinates
        const tooltip = d3.select("body")
            .append("div")
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.5)")
            .style("color", "white")
            .style("padding", "5px")
            .style("border-radius", "3px")
            .style("font-size", "18px")
            .style("display", "none");
            const hoverGroup = svg.append("g").attr("class", "hover-group");

        // Vertical line connecting to axis
        const verticalLine = hoverGroup.append("line")
            .attr("stroke", "white")
            .style("opacity", 0);

        const horizontalLine = hoverGroup.append("line")
            .attr("stroke", "white")
            .style("opacity", 0);

        const selectWavelength = svg.append("line")
            .attr("stroke", "white")
            .attr("stroke-width", 10)
            .style("opacity", 0)
            .attr("y1", 45)
            .attr("y2", height + 45);

        // Define drag behavior
        const drag = d3.drag()
        .on("start", (event) => {
            selectWavelength.style("opacity", 0.7);
        })
        .on("drag", (event) => {
            const mouseX = event.x;
            const xValue = xScale.invert(mouseX);

            // Constrain drag within bounds
            if (mouseX >= margin.left && mouseX <= width - margin.right) {
                selectWavelength
                    .attr("x1", mouseX)
                    .attr("x2", mouseX);

                // Update selectedWavelength value
                if (setSelectedWavelength && setSelectedPatientId) {
                    setSelectedWavelength(xValue);
                    setSelectedPatientId(patientNumber);
                }

                // Optionally, update the tooltip to reflect current value
                tooltip
                    .style("display", "block")
                    .style("left", `${event.sourceEvent.pageX + 10}px`)
                    .style("top", `${event.sourceEvent.pageY - 10}px`)
                    .html(`Wavelength: ${xValue.toFixed(0)}`);
            }
        })
        .on("end", () => {
            tooltip.style("display", "none");
        });

        // Control mouse events with overlay    
        svg.append("rect")
            .attr("class", "hover-rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .call(drag)
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
                selectWavelength.style("opacity", 0.7);
                selectWavelength
                    .attr("x1", mouseX)
                    .attr("x2", mouseX)
                    .attr("y1", 65)
                    .attr("y2", height + 45);

                // Update selectedWavelength value
                if (setSelectedWavelength && setSelectedPatientId) {
                    setSelectedWavelength(xValue);
                    setSelectedPatientId(patientNumber);
                }

                // Optionally, update the tooltip to reflect current value
                tooltip
                    .style("display", "block")
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 10}px`)
                    .html(`Wavelength: ${xValue.toFixed(0)}`);

            // tooltip.style("display", "none");

                if (setSelectedWavelength) {
        setSelectedWavelength(xValue);
    }
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