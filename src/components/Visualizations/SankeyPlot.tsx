import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin } from '../../types';

// Constructing interfaces and types

interface Sankey {
    id: string | number,
    gender: string,
    age: number,
    race: string,
    ethnicity: boolean | string,
    bmi: string,
    stage: string | number,
    [key: string]: any
}

interface SankeyData {
    nodes: SankeyNode[];
    links: SankeyLink[];
}

type SankeyNode = {
    id: string | number;
    name: string;
    x: number;
    y: number;
    y0?: number;
    y1?: number;
    x0?: number;
    x1?: number;
    dy: number;
    value: number;
};

type SankeyLink = {
    source: string | number;
    target: string | number;
    value: number;
    dy?: number;
};

export default function SankeyPlot( {theme} ) { // Import dashboard theme

    // Initialize use states
    const [sankeyData, setSankey] = useState<SankeyData>({ nodes: [], links: [] });
    const sankeyRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
    const margin: Margin = { top: 50, right: 100, bottom: 50, left: 100 };
    const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200)

    useResizeObserver({ ref: sankeyRef, onResize });
    
    // Set background color to match theme 
    useEffect(() => {
        if (sankeyRef.current) {
        sankeyRef.current.style.backgroundColor = theme.palette.background.default;
        }
    }, [theme]);

    // Read CSV file, data preprocessing
    useEffect(() => {
        const dataFromCSV = async () => {
            try {
            const csvData: Sankey[] = await d3.csv('../../../data/Inventory_Patient_ECS272.csv', d => {
                // Rename keys, drop columns
                const formattedGender = d.Gender === "Male Gender" ? "Male" : "Female";
                const formattedEthnicity = d.Ethnicity === "Hispanic or Latino" ? true : false; // Unsure how to include Unknown
                
                let formattedBmi;
                if (Number(d.BMI) < 18.5) {
                    formattedBmi = "Underweight"
                } else if ( Number(d.BMI) < 24.9) {
                    formattedBmi = "Average Weight"
                } else {
                    formattedBmi = "Overweight"
                }

                const formattedStage = d.Staging_Overall === "IVA/I" ? "IVA" : d.Staging_Overall

                // Return all values
                return {
                    id: d.Patient_OD,
                    gender: formattedGender,
                    age: Number(d.Age),
                    race: d.Race,
                    ethnicity: formattedEthnicity,
                    bmi: formattedBmi,
                    stage: formattedStage
                };
            });

            // Put data in sankey format

            // Create nodes
            const uniqueCategories = new Set();
            csvData.forEach(d => {
                uniqueCategories.add(d.gender);
                uniqueCategories.add(d.race);
                uniqueCategories.add(d.ethnicity);
                uniqueCategories.add(d.bmi);
                uniqueCategories.add(d.stage);
            });
            
            const nodes: SankeyNode[] = []
            
            Array.from(uniqueCategories).forEach((name: string, index) => {
                if (name !== "NaN" || "Nan") {
                    nodes.push({
                        id: name,
                        name: name,
                        x: index * 150,
                        y: 0,
                        dy: 100,
                        value: 0
                    });
                }
            });

            // Create links
            const links: SankeyLink[] = [];
            const levels = ['stage', 'gender', 'ethnicity', 'race', 'bmi']; // Sankey flow from left to right

            for (let i = 0; i < levels.length - 1; i++) {
                const currentLevel = levels[i];
                const nextLevel = levels[i + 1];
                const flows = d3.rollups(
                    csvData,
                    v => v.length,
                    d => d[currentLevel],
                    d => d[nextLevel]
                );
                flows.forEach(([source, targets]) => {
                    targets.forEach(([target, value]) => {
                        links.push({ source, target, value });
                    });
                });
            }

            links.forEach(link => {
                if (!nodes.some(node => node.id === link.source)) {
                    console.error("Missing node for source:", link.source);
                }
                if (!nodes.some(node => node.id === link.target)) {
                    console.error("Missing node for target:", link.target);
                }
            });

            setSankey({ nodes, links });
            } catch (error) {
            console.error('Error loading CSV:', error);
            }
        } 
        dataFromCSV();
    }, [])

    // Refreshing page
    useEffect(() => {
        if (isEmpty(sankeyData)) return;
        if (size.width === 0 || size.height === 0) return;
        d3.select('#sankey-svg').selectAll('*').remove();
        initSankey();
    }, [sankeyData, size])

    // Initialize Sankey function
    function initSankey() {

        // Initialize dimensions of plot by removing margins
        const width = size.width - margin.left - margin.right;
        const height = size.height - margin.top - margin.bottom;

        // Append SVG to HTML element
        let sankeyContainer = d3.select('#sankey-svg')
        let svg = sankeyContainer.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

        // Initialize color scale
        const color = d3.scaleOrdinal(["#221150","#400f74","#6d1d81","#701f81","#932b80","#a02f7f","#b2357b","#d8456c","#e04c67"]);

        // Create sankey and set properties
        const sankeyDiagram = sankey()
            .nodeWidth(30)
            .nodePadding(10)
            .extent([[1, 10], [width, height]]);

        // Replace with index
        const nodeIndexMap = new Map(sankeyData.nodes.map((node, index) => [node.id, index]));

        sankeyData.links.forEach(link => {
            const sourceIndex = nodeIndexMap.get(link.source);
            const targetIndex = nodeIndexMap.get(link.target);
            
            // Removes undefined indexes or circular links
            if ((sourceIndex !== undefined && targetIndex !== undefined) && (sourceIndex !== targetIndex)) {
                link.source = sourceIndex;
                link.target = targetIndex;
            } else {
                // Handle invalid links
                console.error(`Invalid link detected: ${link.source} -> ${link.target}`);
            }
        });

        // Construct sankey based on data
        sankeyDiagram
            .nodes(sankeyData.nodes)
            .links(sankeyData.links)    

        // Compute the diagram layout
        const graph = sankeyDiagram(sankeyData);

        // Create sankey links
        const sankeyLinks = svg.append("g")
        .selectAll(".link")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", sankeyLinkHorizontal())
        .style("fill", "none") // Ensure no fill for paths
        .style("stroke", d => color(d.source.id)) // Use your color function
        .style("stroke-width", d => Math.max(1, (d.width || 0)));

        // Create sankey nodes 
        const sankeyNodes = svg.append("g")
            .selectAll()
            .data(graph.nodes)
            .join("rect")
            .attr("x", d => d.x0 as number)
            .attr("y", d => d.y0 as number)
            .attr("height", d => d.y1 as number - (d.y0 as number))
            .attr("width", d => d.x1 as number - (d.x0 as number))
            .attr("fill", d => color(d.id)); // Flagged for error but it works

        // Create node labels
        const sankeyLabels = svg.append("g")
            .selectAll()
            .data(graph.nodes)
            .join("text")
            .attr("x", d => (d.x0 as number) - 10)
            .attr("y", d => (d.y0 as number) + 10)
            .attr("dy", "0.35em")
            .attr("text-anchor", "start")
            .attr("fill", "white")
            .attr("font-size", "12px")
            .text(d => d.id);

        // Get column info for each attribute
        const columns = d3.group(graph.nodes, d => d.x0);
        const sortedColumns = Array.from(columns).sort(([x0A], [x0B]) => (x0A || 0) - (x0B || 0));
        console.log(columns)
        const columnLabels = svg.append("g")
            .attr("class", "column-labels");

        // Create labels
        const levels = ['Stage', 'Gender', 'Ethnicity', 'Race', 'BMI'];
        
        sortedColumns.forEach(([xPosition, nodes], index) => {
            columnLabels.append("text")
                .attr("x", (xPosition || 0) + 40)
                .attr("y", 0)
                .attr("text-anchor", "end")
                .text(getColumnLabel(index as number))
                .style("font-size", "16px")
                .style("fill", "white");
        });

        // Column label helper function
        function getColumnLabel(index: number) {
            return levels[index] || "Unknown";
        }

        // Create plot label
        const title = sankeyContainer.append('g')
            .append('text')
            .attr('transform', `translate(${size.width / 2}, ${size.height - margin.top + 15})`)
            .attr('dy', 0)
            .style('text-anchor', 'middle')
            .style("fill", theme.palette.text.primary)
            .style('font-weight', 'bold')
            .style('font-size', '18px')
            .text('Patient Metadata Distribution')

    }

    return (
        <>
            <div ref={sankeyRef} className='chart-container'>
                <svg id='sankey-svg' width='100%' height='100%'></svg>
            </div>
        </>
    )
}