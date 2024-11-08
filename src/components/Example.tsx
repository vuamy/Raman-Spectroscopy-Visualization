import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import dataFromJson from '../../data/demo.json';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';

import { Bar, ComponentSize, Margin } from '../types';
// A "extends" B means A inherits the properties and methods from B.
interface CategoricalBar extends Bar{
  category: string;
}



export default function Example() {
  const [bars, setBars] = useState<CategoricalBar[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 40, right: 20, bottom: 80, left: 60 };
  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200)

  useResizeObserver({ ref: barRef, onResize });
  
  useEffect(() => {
    // For reading json file
    /*if (isEmpty(dataFromJson)) return;
    setBars(dataFromJson.data);*/
    
    // For reading csv file
    const dataFromCSV = async () => {
      try {
        const csvData = await d3.csv('../../data/demo.csv', d => {
          // This callback allows you to rename the keys, format values, and drop columns you don't need
          return {category: d.category, value: +d.value};
        });
        setBars(csvData);
      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    } 
    dataFromCSV();
  }, [])

  useEffect(() => {
    if (isEmpty(bars)) return;
    if (size.width === 0 || size.height === 0) return;
    d3.select('#bar-svg').selectAll('*').remove();
    initChart();
  }, [bars, size])

  function initChart() {
    // select the svg tag so that we can insert(render) elements, i.e., draw the chart, within it.
    let chartContainer = d3.select('#bar-svg')


    // Here we compute the [min, max] from the data values of the attributes that will be used to represent x- and y-axis.
    let yExtents = d3.extent(bars.map((d: CategoricalBar) => d.value as number)) as [number, number]
    // This is to get the unique categories from the data using Set, then store in an array.
    let xCategories: string[] = [ ...new Set(bars.map((d: CategoricalBar) => d.category as string))]

    // We need a way to map our data to where it should be rendered within the svg (in screen pixels), based on the data value, 
    //      so the extents and the unique values above help us define the limits.
    // Scales are just like mapping functions y = f(x), where x refers to domain, y refers to range. 
    //      In our case, x should be the data, y should be the screen pixels.
    // We have the margin here just to leave some space
    // In viewport (our screen), the leftmost side always refer to 0 in the horizontal coordinates in pixels (x). 
    let xScale = d3.scaleBand()
      .rangeRound([margin.left, size.width - margin.right])
      .domain(xCategories)
      .padding(0.1) // spacing between the categories

    // In viewport (our screen), the topmost side always refer to 0 in the vertical coordinates in pixels (y). 
    let yScale = d3.scaleLinear()
      .range([size.height - margin.bottom, margin.top]) //bottom side to the top side on the screen
      .domain([0, yExtents[1]]) // This is based on your data, but if there is a natural value range for your data attribute, you should follow
      // e.g., it is natural to define [0, 100] for the exame score, or [0, <maxVal>] for counts.

    // There are other scales such as scaleOrdinal,
        // whichever is appropriate depends on the data types and the kind of visualizations you're creating.

    // This following part visualizes the axes along with axis labels.
    // Check out https://observablehq.com/@d3/margin-convention?collection=@d3/d3-axis for more details
    const xAxis = chartContainer.append('g')
      .attr('transform', `translate(0, ${size.height - margin.bottom})`)
      .call(d3.axisBottom(xScale))

    const yAxis = chartContainer.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale))

    const yLabel = chartContainer.append('g')
      .attr('transform', `translate(${margin.left / 2}, ${size.height / 2}) rotate(-90)`)
      .append('text')
      .text('Value')
      .style('font-size', '.8rem')

    const xLabel = chartContainer.append('g')
      .attr('transform', `translate(${(size.width - margin.left) / 2}, ${size.height - margin.top})`)
      .append('text')
      .text('Categories')
      .style('font-size', '.8rem')
    
    // "g" is grouping element that does nothing but helps avoid DOM looking like a mess
    // We iterate through each <CategoricalBar> element in the array, create a rectangle for each and indicate the coordinates, the rectangle, and the color.
    const chartBars = chartContainer.append('g')
      .selectAll('rect')
      .data<CategoricalBar>(bars) // TypeScript expression. This always expects an array of objects.
      .join('rect')
      // specify the left-top coordinate of the rectangle
      .attr('x', (d: CategoricalBar) => xScale(d.category) as number)
      .attr('y', (d: CategoricalBar) => yScale(d.value) as number)
      // specify the size of the rectangle
      .attr('width', xScale.bandwidth())
      .attr('height', (d: CategoricalBar) => Math.abs(yScale(0) - yScale(d.value))) // this substraction is reversed so the result is non-negative
      .attr('fill', 'teal')

    // For transform, check out https://www.tutorialspoint.com/d3js/d3js_svg_transformation.htm, but essentially we are adjusting the positions of the selected elements.
    const title = chartContainer.append('g')
      .append('text') // adding the text
      .attr('transform', `translate(${size.width / 2}, ${size.height - margin.top + 15})`)
      .attr('dy', '0.5rem') // relative distance from the indicated coordinates.
      .style('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .text('Distribution of Demo Data') // text content    
  }

  return (
    <>
      <div ref={barRef} className='chart-container'>
        <svg id='bar-svg' width='100%' height='100%'></svg>
      </div>
    </>
  )
}
