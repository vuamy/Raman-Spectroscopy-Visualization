import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { isEmpty, set } from 'lodash';
import '../../style.css';

// Define types
interface DataPoint {
  age: number;
  bmi: number;
  stage: string;
  id: string;
  race: string;
  gender: string;
  pos: string;
}

interface ComponentSize {
  width: number;
  height: number;
}

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ScatterPlotProps {
    setSelectedPatientId: (id: string | null) => void; // Prop for setting selected patient ID
    setSelectedWavelength: (id: number | null) => void;
  }


export default function ScatterPlot( {setSelectedPatientId, setSelectedWavelength}: ScatterPlotProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const scatterRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const [highlightedPos, setHighlightedPos] = useState<boolean>(false);
  const margin: Margin = { top: 30, right: 100, bottom: 65, left: 100 };
  
  // Set up debounce callback for resizing
  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);

  // Set up resize observer for the chart container
  useResizeObserver({ ref: scatterRef, onResize });

  // Data loading logic (CSV)
  useEffect(() => {
    const dataFromCSV = async () => {
      try {
        const csvData = await d3.csv('../../../data/Inventory_Patient_ECS272.csv', (d: any) => {
          const age = d['Age'] ? +d['Age'] : NaN;
          const bmi = d['BMI'] ? +d['BMI'] : NaN;
          const id = d['Patient_OD'] ? d['Patient_OD'] : '';
          const pos = d['pos'] ? d['pos'] : '';
          const formattedGender = d.Gender === "Male Gender" ? "Male" : "Female";
          let formattedRace = d['Race'] === "Unknown" || d['Race'] === "Other" ? "Unknown/Other" : d['Race'];
          
          let formattedStage;
            if (d.Staging_Overall.startsWith("IV") || d.Staging_Overall === "III") {
                formattedStage = "Late Stage";
            } else if (d.Staging_Overall === "I" || d.Staging_Overall === "II") {
                formattedStage = "Early Stage";
            } else {
                formattedStage = d.Staging_Overall;
            }
            formattedStage = formattedStage === "Nan" ? "Healthy" : formattedStage;

          if (isNaN(age) || isNaN(bmi) || isEmpty(formattedStage)) {
            return null; // Filter out invalid data
          }
          return {
            age: age,
            bmi: bmi,
            stage: formattedStage,
            id: id,
            race: formattedRace,
            gender: formattedGender,
            pos: pos
          } as DataPoint;
        });
        const filteredData = csvData.filter(d => d !== null); // Remove null values
        setData(filteredData);
        // console.log(filteredData);  // Inspect loaded data

      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };
    
    dataFromCSV();
  }, []);

  // Chart rendering logic
  useEffect(() => {
    if (!data.length || size.width === 0 || size.height === 0) return;

    d3.select('#scatter-svg').selectAll('*').remove(); // Clear the previous chart
    initChart(); // Initialize new chart
  }, [data, size, highlightedPos]);

  function initChart() {
    const chartContainer = d3.select('#scatter-svg');
    let selectedPatientId: string | null = null; // To store the selected patient ID
  
    // Define scales with padding
    const xExtent = d3.extent(data, d => d.age) as [number, number];
    const yExtent = d3.extent(data, d => d.bmi) as [number, number];
  
    const xScale = d3.scaleLinear()
      .range([margin.left, size.width - margin.right])
      .domain([xExtent[0] - (xExtent[1] - xExtent[0]) * 0.1, xExtent[1] + (xExtent[1] - xExtent[0]) * 0.1]);
  
    const yScale = d3.scaleLinear()
      .range([size.height - margin.bottom, margin.top + 20])
      .domain([yExtent[0] - (yExtent[1] - yExtent[0]) * 0.1, yExtent[1] + (yExtent[1] - yExtent[0]) * 0.1]);
  
    const colorScale = d3.scaleOrdinal()
        .domain(['Late Stage','Early Stage', 'Healthy'])
        .range(['#cd2a2a', '#cf8a29', '#3cabe1']);

    // Create axes
    chartContainer.append('g')
      .attr('transform', `translate(0, ${size.height - margin.bottom})`)
      .call(d3.axisBottom(xScale));
  
    chartContainer.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale));
  
    // Tooltip setup
    const tooltip = d3.select(scatterRef.current)
      .append('div')
      .style('position', 'absolute')
      .style("background", "rgba(0, 0, 0, 0.5)")
      .style("color", "white")
      .style("padding", "5px")
      .style("border-radius", "3px")
      .style("font-size", "10px")
      .style('pointer-events', 'none')
      .style('visibility', 'hidden');
  
    // Draw scatter plot
    const circles = chartContainer.selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', d => xScale(d.age))
      .attr('cy', d => yScale(d.bmi))
      .attr('r', 5)
      .attr('fill', d => colorScale(d.stage) as string)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5)
      .style('display', d => (highlightedPos && d.pos === 'No' ? 'none' : 'block')) // Hide points based on toggle
      .attr('opacity', 0.8)
      .on('mouseover', (event, d) => {
        // Show tooltip
        tooltip.style('visibility', 'visible')
          .html(`Patient ID: ${d.id}<br/>
             Stage: ${d.stage}<br/>
             Age: ${d.age}<br/>
             BMI: ${d.bmi}<br/>
             Race: ${d.race}<br/>
             Gender: ${d.gender}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
          })
          .on('mouseout', (event, d) => {
        tooltip.style('visibility', 'hidden');
    })
    .on('click', (event, d: DataPoint) => {
        if (d.pos === 'Yes') {
            if (selectedPatientId === d.id) {
                // Unselect the patient if already selected
                d3.select(event.currentTarget)
                  .attr('stroke', 'black')
                  .attr('stroke-width', 0.5);
                
                // Reset all circle opacities
                d3.selectAll('circle')
                  .attr('opacity', (d: DataPoint) => (highlightedPos && d.pos === 'Yes' ? 1 : highlightedPos ? 0.2 : 0.8));
                
                // Set selectedPatientId to null
                selectedPatientId = null;
                setSelectedPatientId(null);
                setSelectedWavelength(0)
            } else {
                // Select a new patient
                d3.selectAll('circle')
                  .attr('opacity', 0.2)
                  .attr('stroke', 'black')
                  .attr('stroke-width', 0.5);
                
                d3.select(event.currentTarget)
                  .attr('opacity', 1)
                  .attr('stroke', 'yellow')
                  .attr('stroke-width', 2);
                
                // Update selectedPatientId
                selectedPatientId = d.id;
                setSelectedPatientId(d.id);
                
                
            }
        }
    });
    
    // add legend
    const legend = chartContainer.append('g')
      .attr('transform', `translate(${size.width - margin.right*1.5}, ${margin.top + size.height / 15})`);

    const legendGroups = legend.selectAll('g')
        .data(colorScale.domain())
        .join('g')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);

    legendGroups.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr( 'opacity', 0.9)
        .attr('fill', d => colorScale(d) as string);

    legendGroups.append('text')
        .text(d => d)
        .attr('x', 20)
        .attr('y', 10)
        .style('font-size', '14px')
        .style('fill', 'white');
    // Calculate mean age and BMI for each stage group
    const meanValues = d3.rollups(
      data,
      v => ({
      meanAge: d3.mean(v, d => d.age),
      meanBmi: d3.mean(v, d => d.bmi)
      }),
      d => d.stage
    );

    // Add dashed lines for mean age and BMI
    if (!highlightedPos) {
      meanValues.forEach(([stage, { meanAge, meanBmi }]) => {
      const color = colorScale(stage);

      // Mean age line
      chartContainer.append('line')
      .attr('x1', xScale(meanAge as number))
      .attr('x2', xScale(meanAge as number))
      .attr('y1', margin.top +30)
      .attr('y2', size.height - margin.bottom)
      .attr('stroke', color as string)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 4');

      // Mean BMI line
      chartContainer.append('line')
      .attr('x1', margin.left)
      .attr('x2', size.width - margin.right)
      .attr('y1', yScale(meanBmi as number))
      .attr('y2', yScale(meanBmi as number))
      .attr('stroke', color as string)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 4');
      });
    }

    // Add title
    chartContainer.append('text')
      .attr('x', size.width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .style('font-size', '18px')
      .text('Patient Age vs. BMI')
      .style("fill", "white");
  
    // Add axis labels
    chartContainer.append('text')
      .attr('x', size.width / 2)
      .attr('y', size.height - 35)
      .attr('text-anchor', 'middle')
      .text('Age')
      .style("font-size", "16px")
      .style("fill", "white");
  
    chartContainer.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -size.height / 2 + 10)
      .attr('y', 70)
      .attr('text-anchor', 'middle')
      .text('BMI')
      .style("font-size", "16px")
      .style("fill", "white");
  }
  
  
  return (
    <div style={{ height: '100%', width: '100%'}}>
      <div className="toggle-switch">
        <input
          type="checkbox"
          id="highlight-toggle"
          checked={highlightedPos}
          onChange={() => setHighlightedPos(!highlightedPos)}
        />
        <label htmlFor="highlight-toggle">Only Show Patients with Measured Spectra</label>
      </div>
      <div ref={scatterRef} className='chart-container'>
        <svg id='scatter-svg' width='100%' height='100%'></svg>
      </div>
    </div>
  );
};