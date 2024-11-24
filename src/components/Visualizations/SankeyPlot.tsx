import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin } from '../../types';
import { MarginOutlined } from '@mui/icons-material';

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
    const margin: Margin = { top: 75, right: 100, bottom: 10, left: 100 };
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
        const color = d3.scaleOrdinal(["#4A90E2", "#6C63FF", "#7B2CBF", "#9B5DE5", "#C084FC", "#FF89BB", "#FF5D8F", "#FF2E63", "#D72638", "#851DE0"] );

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

        // Create zoomable group
        const zoomableGroup = svg.append("g")
            .attr("class", "zoomable");

        // Create sankey links
        const sankeyLinks = zoomableGroup.selectAll(".link")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", sankeyLinkHorizontal())
        .style("fill", "none") // Ensure no fill for paths
        .style("stroke", d => color(d.source.id)) // Use your color function
        .style("stroke-width", d => Math.max(1, (d.width + 2|| 0)))
        .style("opacity", 0.8)

        // Create sankey nodes 
        const sankeyNodes = zoomableGroup.selectAll()
            .data(graph.nodes)
            .join("rect")
            .attr("x", d => d.x0 as number)
            .attr("y", d => d.y0 as number - 1)
            .attr("height", d => d.y1 as number - (d.y0 as number) + 2)
            .attr("width", d => d.x1 as number - (d.x0 as number) + 30)
            .attr("fill", d => color(d.id)) // Flagged for error but it works
            .on("click", (_, node) => handleNodeClick(node)) // Highlighting
            .attr("cursor", "pointer")

        // Create node labels
        const sankeyLabels = zoomableGroup.selectAll()
            .data(graph.nodes)
            .join("text")
            .attr("x", d => (d.x0 as number))
            .attr("y", d => (d.y0 as number))
            .attr("dy", "0.35em")
            .attr("text-anchor", "start")
            .attr("fill", "white")
            .attr("font-size", "12px")
            .text(d => d.id)
            .style("pointer-events", "none");

        // Get column info for each attribute
        const columns = d3.group(graph.nodes, d => d.x0);
        const sortedColumns = Array.from(columns).sort(([x0A], [x0B]) => (x0A || 0) - (x0B || 0));
        const columnLabels = zoomableGroup.attr("class", "column-labels");

        // Create labels
        const levels = ['Stage', 'Gender', 'Hispanic/Latino', 'Race', 'BMI'];
        sortedColumns.forEach(([xPosition, nodes], index) => {
            columnLabels.append("text")
                .attr("x", (xPosition || 0))
                .attr("y", -5)
                .attr("text-anchor", "start")
                .text(getColumnLabel(index as number))
                .style("font-size", "16px")
                .style("fill", "white")
        });

        // Column label helper function
        function getColumnLabel(index: number) {
            return levels[index] || "Unknown";
        }

        // Create plot label
        const title = sankeyContainer.append('g')
            .append('text')
            .attr('transform', `translate(${size.width / 2}, ${margin.top / 2})`)
            .attr('dy', 0)
            .style('text-anchor', 'middle')
            .style("fill", theme.palette.text.primary)
            .style('font-weight', 'bold')
            .style('font-size', '18px')
            .text('Patient Metadata Distribution')

        // Track if currently in higlighted state
        let isHighlighted = false;

        // Track the currently highlighted node
        let currentHighlightedNode = null;

        // Helper function to handle highlighting on click
        function handleNodeClick(node) {

            if (currentHighlightedNode === node.id) {

                currentHighlightedNode = null;
                isHighlighted = false;

                // Reset to default
                sankeyLinks
                    .transition()
                    .duration(500)
                    .style("stroke-opacity", 0.8)
                    .style("stroke", d => color(d.source.id));
                sankeyNodes
                    .transition()
                    .duration(500)
                    .style("opacity",1);
            
            } else {
                
                currentHighlightedNode = node.id;
                isHighlighted = true;

                // Highlight connected links
                sankeyLinks
                    .transition()
                    .duration(500)
                    .style("stroke-opacity", d =>
                        d.source.id === node.id || d.target.id === node.id ? 1 : 0.2
                    )
                    .style("stroke", d =>
                        d.source.id === node.id || d.target.id === node.id ? "#E2B6FF" : color(d.source.id)
                    );
                    
            
                // Highlight connected nodes
                sankeyNodes
                    .transition()
                    .duration(500)
                    .style("opacity", d =>
                        d.id === node.id || graph.links.some(link => 
                            (link.source.id === node.id && link.target.id === d.id) ||
                            (link.target.id === node.id && link.source.id === d.id)
                        ) ? 1 : 0.5);

            }
        }

        // Create tooltip for hovering on paths
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

        // Connect tooltip to paths
        sankeyLinks
            // On hover, display tooltip
            .on("mouseover", function (event, d) {
                tooltip.style("visibility", "visible");
                const tooltipContent = `${d.source.id} → ${d.target.id}\n, Count: ${d.value}`;
                tooltipText.text(tooltipContent);
                const bbox = tooltipText.node().getBBox();

                tooltipRect
                    .attr("width", bbox.width + 10) 
                    .attr("height", bbox.height + 5)
                    .attr("x", bbox.x - 5)
                    .attr("y", bbox.y - 2.5);

            })
            // When moving mouse, tooltip follows cursor
            .on("mousemove", function (event, d) {
                const [x, y] = d3.pointer(event, svg.node());
                tooltip.attr("transform", `translate(${x + 10}, ${y - 20})`);
            })
            // No longer on path, hides tooltip
            .on("mouseout", function () {
                tooltip.style("visibility", "hidden");
            });

        // Add buttons for zooming in and out
        const buttonColor = "#1F2933"

        const zoomButtonsGroup = svg.append("g")
            .attr("class", "zoom-buttons")
            .attr("transform", `translate(0, ${-margin.top + 20})`)
            .attr("position", "absolute")

        const zoomInButton = zoomButtonsGroup.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", buttonColor)
            .attr("rx", 5)
        
        const zoomInText = zoomButtonsGroup.append("text")
            .attr("x", 10)
            .attr("y", 17)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", 20)
            .text("+")  
            .attr("cursor", "pointer");
        
        const zoomOutButton = zoomButtonsGroup.append("rect")
            .attr("x", 30)
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", buttonColor)
            .attr("rx", 5)
        
        const zoomOutText = zoomButtonsGroup.append("text")
            .attr("x", 40)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", 20)
            .text("-")
            .attr("cursor", "pointer");

        const resetButton = zoomButtonsGroup.append("rect")
            .attr("x", 60)
            .attr("width", 50)
            .attr("height", 20)
            .attr("fill", buttonColor)
            .attr("rx", 5)
        
        const resetText = zoomButtonsGroup.append("text")
            .attr("x", 85)
            .attr("y", 14)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-size", 12)
            .text("Reset")
            .attr("cursor", "pointer");
        
        // Minimum and maximum zoom
        const minZoom = 0.5
        const maxZoom = 20

        // Use d3 to add zoom to entire SVG
        const zoom = d3.zoom()
            .scaleExtent([minZoom, maxZoom])
            .translateExtent([[0, 0], [width * 1.5, height * 1.5]])
            .on("zoom", zoomed);
        svg.call(zoom).on("wheel.zoom", null);

        // Zoom function to handle update of sankeyContainer
        function zoomed(event) {
            zoomableGroup.attr("transform", event.transform);
        }

        // Handle zoom in
        zoomInText.on("click", function() {
            const currentTransform = d3.zoomTransform(zoomableGroup.node());
            console.log(currentTransform)
            const newZoomLevel = Math.min(currentTransform.k * 1.2, maxZoom);
            const newTransform = d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(newZoomLevel);
            svg.transition().duration(250).call(zoom.transform, newTransform);
        });

        // Handle zoom out
        zoomOutText.on("click", function() {
            const currentTransform = d3.zoomTransform(zoomableGroup.node());
            const newZoomLevel = Math.max(currentTransform.k / 1.2, minZoom);
            const newTransform = d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(newZoomLevel);
            svg.transition().duration(250).call(zoom.transform, newTransform);
        });

        // Handle reset zoom
        resetText.on("click", function() {
            svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);
        });

    }

    return (
        <>
            <div ref={sankeyRef} className='chart-container'>
                <svg id='sankey-svg' width='100%' height='100%'></svg>
            </div>
        </>
    )
}