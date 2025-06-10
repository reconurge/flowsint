import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useSketchStore } from '@/stores/sketch-store';
import { useNodesDisplaySettings } from '@/stores/node-display-settings';
import { useGraphControls } from '@/stores/graph-controls-store';
import type { NodeData, EdgeData } from '@/types';
import type { ItemType } from '@/stores/node-display-settings';

interface GraphReactForceProps {
    style?: React.CSSProperties;
}

const GraphReactForce: React.FC<GraphReactForceProps> = () => {
    const nodes = useSketchStore(s => s.nodes) as NodeData[];
    const rawEdges = useSketchStore(s => s.edges) as EdgeData[];
    const getIcon = useNodesDisplaySettings(s => s.getIcon);
    const getSize = useNodesDisplaySettings(s => s.getSize);
    const colors = useNodesDisplaySettings(s => s.colors) as Record<ItemType, string>;
    const toggleNodeSelection = useSketchStore(s => s.toggleNodeSelection);
    const clearSelectedNodes = useSketchStore(s => s.clearSelectedNodes);
    const currentNode = useSketchStore(s => s.currentNode);
    const setActions = useGraphControls(s => s.setActions);

    // Transform data for Force Graph
    const graphData = useMemo(() => {
        const transformedNodes = nodes.map(node => {
            const type = node.type || node.data?.type;
            const color = colors[type] || '#0074D9';
            const size = getSize(type) * 0.5;
            let nodeLabel = node.label;
            if (!nodeLabel && 'caption' in node) nodeLabel = (node as any).caption;
            if (!nodeLabel) nodeLabel = node.id;

            return {
                ...node,
                nodeLabel: nodeLabel,
                nodeColor: color,
                nodeSize: size,
                val: size, // Force Graph uses val for node size
            };
        });

        const transformedEdges = rawEdges.map(edge => ({
            ...edge,
            edgeLabel: edge.label,
            source: edge.from,
            target: edge.to,
        }));

        return {
            nodes: transformedNodes,
            links: transformedEdges,
        };
    }, [nodes, rawEdges, getIcon, getSize, colors]);

    React.useEffect(() => {
        if (graphRef.current && currentNode) {
            console.log(currentNode, currentNode)
            graphRef.current.zoomToFit(400);
        }
    }, [currentNode]);

    const handleNodeClick = useCallback((node: any) => {
        toggleNodeSelection(node, false);
    }, [toggleNodeSelection]);

    const handleBackgroundClick = useCallback(() => {
        clearSelectedNodes()
    }, [clearSelectedNodes]);

    // Camera controls
    const handleZoomIn = useCallback((graph: any) => {
        const zoom = graph.zoom();
        graph.zoom(zoom * 1.5);
    }, []);

    const handleZoomOut = useCallback((graph: any) => {
        const zoom = graph.zoom();
        graph.zoom(zoom * 0.75);
    }, []);

    const handleFit = useCallback((graph: any) => {
        graph.zoomToFit(400);
    }, []);

    // Set actions in store
    React.useEffect(() => {
        setActions({
            zoomIn: () => handleZoomIn(graphRef.current),
            zoomOut: () => handleZoomOut(graphRef.current),
            zoomToFit: () => handleFit(graphRef.current),
        });
    }, [setActions, handleZoomIn, handleZoomOut, handleFit]);

    const graphRef = React.useRef<any>();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Handle container resize
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
            if (graphRef.current) {
                graphRef.current.d3ReheatSimulation();
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div className="relative h-full grow w-full bg-background">
            <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 300 }}>
                <ForceGraph2D
                    ref={graphRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={graphData}
                    nodeLabel="label"
                    nodeColor={node => node.nodeColor}
                    nodeRelSize={6}
                    linkDirectionalArrowLength={3.5}
                    linkDirectionalArrowRelPos={1}
                    cooldownTicks={100}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={handleBackgroundClick}
                    onNodeHover={(node: any) => {
                        // Highlight connected nodes and links
                        if (node) {
                            graphData.nodes.forEach((n: any) => {
                                n.__highlighted = n === node;
                                n.__dimmed = n !== node;
                            });
                            graphData.links.forEach((l: any) => {
                                l.__highlighted = l.source === node || l.target === node;
                                l.__dimmed = l.source !== node && l.target !== node;
                            });
                        } else {
                            // Reset all nodes and links
                            graphData.nodes.forEach((n: any) => {
                                n.__highlighted = false;
                                n.__dimmed = false;
                            });
                            graphData.links.forEach((l: any) => {
                                l.__highlighted = false;
                                l.__dimmed = false;
                            });
                        }
                    }}
                    nodeCanvasObject={(node: any, ctx, globalScale) => {
                        const label = node.nodeLabel;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        const textWidth = ctx.measureText(label).width;
                        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                        // Draw node circle
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.nodeSize, 0, 2 * Math.PI, false);
                        ctx.fillStyle = node.__highlighted ? node.nodeColor : node.__dimmed ? '#ccc' : node.nodeColor;
                        ctx.fill();

                        // Level of detail based on zoom
                        if (globalScale > 3) {
                            // Show full details: icon + label
                            const icon = getIcon(node.type || node.data?.type);
                            if (icon) {
                                ctx.font = `${fontSize * 1.2}px Sans-Serif`;
                                ctx.fillText(icon, node.x - fontSize, node.y + fontSize / 3);
                            }
                            ctx.font = `${fontSize}px Sans-Serif`;
                            ctx.fillStyle = node.__highlighted ? '#000' : node.__dimmed ? '#999' : '#000';
                            ctx.fillText(label, node.x + (icon ? fontSize : 0), node.y + fontSize / 3);
                        } else if (globalScale > 2) {
                            // Show only label
                            ctx.fillStyle = node.__highlighted ? '#000' : node.__dimmed ? '#999' : '#000';
                            ctx.fillText(label, node.x - bckgDimensions[0] / 2, node.y + fontSize / 3);
                        }
                        // When zoomed out (globalScale <= 2), show only the node circle
                    }}
                    linkColor={link => link.__highlighted ? '#000' : link.__dimmed ? '#ccc' : '#aaa'}
                    linkWidth={link => link.__highlighted ? 2 : link.__dimmed ? 0.5 : 1}
                    backgroundColor="transparent"
                />
            </div>
        </div>
    );
};

export default GraphReactForce; 