import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { isEmpty } from 'lodash';

// Define types
interface DataPoint {
  age: number;
  bmi: number;
  stage: string;
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

export default function ScatterPlot() {
  const [data, setData] = useState<DataPoint[]>([]);
  const scatterRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 75, right: 100, bottom: 45, left: 100 };
  
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
                          let formattedStage;
                if (d.Staging_Overall.startsWith("IV") || d.Staging_Overall === "III") {
                    formattedStage = "2";
                } else if (d.Staging_Overall === "I" || d.Staging_Overall === "II") {
                    formattedStage = "1";
                } else {
                    formattedStage = d.Staging_Overall;
                }
                formattedStage = formattedStage === "Nan" ? "0" : formattedStage;

          if (isNaN(age) || isNaN(bmi) || isEmpty(formattedStage)) {
            return null; // Filter out invalid data
          }
          return {
            age: age,
            bmi: bmi,
            stage: formattedStage
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
  }, [data, size]);

  function initChart() {
    const chartContainer = d3.select('#scatter-svg');
    
    // Define scales with padding
    const xExtent = d3.extent(data, d => d.age) as [number, number];
    const yExtent = d3.extent(data, d => d.bmi) as [number, number];

    // calculate the mean age and mean bmi for each stage group
    const stageGroups = d3.group(data, d => d.stage);
    const stageMeans = new Map<string, [number, number]>();
    stageGroups.forEach((value, key) => {
      const ageMean = d3.mean(value, d => d.age);
      const bmiMean = d3.mean(value, d => d.bmi);
      stageMeans.set(key, [ageMean, bmiMean]);
    });


    const xScale = d3.scaleLinear()
      .range([margin.left, size.width - margin.right])
      .domain([xExtent[0] - (xExtent[1] - xExtent[0]) * 0.1, xExtent[1] + (xExtent[1] - xExtent[0]) * 0.1]);

    const yScale = d3.scaleLinear()
      .range([size.height - margin.bottom, margin.top])
      .domain([yExtent[0] - (yExtent[1] - yExtent[0]) * 0.1, yExtent[1] + (yExtent[1] - yExtent[0]) * 0.1]);

    // Define color scale
    // use green for 0, orange for 1, red for 2
    const colorScale = d3.scaleOrdinal()
        .domain(['0', '1', '2'])
        .range(['#00FF00', '#FFA500', '#FF0000']);

    // Create axes
    chartContainer.append('g')
      .attr('transform', `translate(0, ${size.height - margin.bottom})`)
      .call(d3.axisBottom(xScale));

    chartContainer.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale));

    // Draw mean lines for each stage group in corresponding color
    stageMeans.forEach((value, key) => {
      chartContainer.append('line')
        .attr('x1', xScale(value[0]))
        .attr('y1', yScale(value[1]))
        .attr('x2', xScale(value[0]))
        .attr('y2', size.height - margin.bottom)
        .attr('stroke', colorScale(key))
        .attr('stroke-width', 2);

      chartContainer.append('line')
        .attr('x1', xScale(value[0]))
        .attr('y1', yScale(value[1]))
        .attr('x2', margin.left)
        .attr('y2', yScale(value[1]))
        .attr('stroke', colorScale(key))
        .attr('stroke-width', 2);
    });



    // Draw scatter plot
    chartContainer.selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', d => xScale(d.age))
      .attr('cy', d => yScale(d.bmi))
      .attr('r', 5)
      .attr('fill', d => colorScale(d.stage))
      .attr('stroke', 'black')
      .attr('opacity', 0.6); // Set opacity to see overlapping marks

    // Add title
    chartContainer.append('text')
      .attr('x', size.width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .style('font-size', '18px')
      .text('Patient Age vs. BMI')
      .style("fill", "white")

    // Add axis labels
    chartContainer.append('text')
      .attr('x', size.width / 2)
      .attr('y', size.height - 10)
      .attr('text-anchor', 'middle')
      .text('Age')
      .style("font-size", "16px")
      .style("fill", "white")

    chartContainer.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -size.height / 2 + 10)
      .attr('y', 70)
      .attr('text-anchor', 'middle')
      .text('BMI')
      .style("font-size", "16px")
      .style("fill", "white")
  }

  return (
    <div ref={scatterRef} className='chart-container'>
      <svg id='scatter-svg' width='100%' height='100%'></svg>
    </div>
  );
}