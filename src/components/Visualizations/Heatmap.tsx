import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin } from '../../types';

// Constructing interfaces and types

// Maybe something like this?
interface Position {
    x: number | string,
    y: number | string,
    value: number,
}

export default function Heatmap({ theme }) {
    
    // Initialize use states
    const [heatmapData, setHeatmap] = useState<Position[]>([]);
    const heatmapRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    const margin: Margin = { top: 50, right: 100, bottom: 100, left: 50 };
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
        const rawData = [
            { x: "2", y: "2" },
            { x: "1", y: "2" },
            { x: "1", y: "2" },
            { x: "1", y: "2" },
            { x: "3", y: "1" },
            { x: "2", y: "3" },
            { x: "2", y: "1" },
            { x: "3", y: "1" },
            { x: "2", y: "3" },
            { x: "2", y: "1" },
            { x: "1", y: "3" },
            { x: "1", y: "1" },
            { x: "3", y: "3" },
            { x: "3", y: "3" },
            { x: "3", y: "3" },
            { x: "3", y: "3" },
            { x: "3", y: "2" },
            { x: "3", y: "2" },
            { x: "3", y: "2" }
        ];

        // Count occurrences of each (x, y) pair
        const counts = new Map();

        rawData.forEach(({ x, y }) => {
            const key = `${x}:${y}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        });

        // Transform counts into an array of objects
        const heatmap = Array.from(counts, ([key, value]) => {
            const [x, y] = key.split(":");
            return { x, y, value };
        });

        setHeatmap(heatmap);
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

        // Append SVG to HTML element
        let heatmapContainer = d3.select('#heatmap-svg')
        let svg = heatmapContainer.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

        // Initialize color scale
        const color = d3.scaleLinear()
            .range(["#FF89BB", "#4A90E2"])
            .domain([1,3])

        // Create groups
        const coordinates = ["1", "2", "3"]

        // Create x scale and axis
        const x = d3.scaleBand()
            .range([ 0, width ])
            .domain(coordinates)
            .padding(0.01);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))

        // Create y scale and axis
        const y = d3.scaleBand()
            .range([ height, 0 ])
            .domain(coordinates)
            .padding(0.01);
        svg.append("g")
            .call(d3.axisLeft(y));

        // Add data
        svg.selectAll()
            .data(heatmapData, function(d) {return d.x+':'+d.y;})
            .enter()
            .append("rect")
            .attr("x", function(d) { return x(d.x as string) })
            .attr("y", function(d) { return y(d.y as string) })
            .attr("width", x.bandwidth() + 1)
            .attr("height", y.bandwidth() + 1)
            .style("fill", function(d) { return color(d.value)} )
        }

    return (
        <>
            <div ref={heatmapRef} className='chart-container'>
                <svg id='heatmap-svg' width='100%' height='100%'></svg>
            </div>
        </>
    );
}