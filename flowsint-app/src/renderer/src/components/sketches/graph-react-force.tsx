import React, { useCallback, useMemo, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useSketchStore } from '@/stores/sketch-store';
import { useNodesDisplaySettings } from '@/stores/node-display-settings';
import { useGraphControls } from '@/stores/graph-controls-store';
import type { NodeData, EdgeData } from '@/types';
import type { ItemType } from '@/stores/node-display-settings';
import EmptyState from './empty-state';
import { useTheme } from '../theme-provider';

interface GraphReactForceProps {
    style?: React.CSSProperties;
}

const NODE_COUNT_THRESHOLD = 500;

const GraphReactForce: React.FC<GraphReactForceProps> = () => {
    const nodes = useSketchStore(s => s.nodes) as NodeData[];
    const rawEdges = useSketchStore(s => s.edges) as EdgeData[];
    const { theme } = useTheme();
    const getSize = useNodesDisplaySettings(s => s.getSize);
    const colors = useNodesDisplaySettings(s => s.colors) as Record<ItemType, string>;
    const toggleNodeSelection = useSketchStore(s => s.toggleNodeSelection);
    const clearSelectedNodes = useSketchStore(s => s.clearSelectedNodes);
    // const currentNode = useSketchStore(s => s.currentNode);
    const setActions = useGraphControls(s => s.setActions);

    const shouldUseSimpleRendering = useMemo(() => nodes.length > NODE_COUNT_THRESHOLD, [nodes.length]);

    // Transform data for Force Graph
    const graphData = useMemo(() => {
        const transformedNodes = nodes.map(node => {
            const type = node.type || node.data?.type;
            const color = colors[type] || '#0074D9';
            const size = getSize(type);
            let nodeLabel = node.label;
            if (!nodeLabel && 'caption' in node) nodeLabel = (node as any).caption;
            if (!nodeLabel) nodeLabel = node.id;

            return {
                ...node,
                nodeLabel: nodeLabel,
                nodeColor: color,
                nodeSize: size,
                val: size,
            };
        });

        const edgeGroups = new Map();
        rawEdges.forEach(edge => {
            const key = `${edge.from}-${edge.to}`;
            if (!edgeGroups.has(key)) {
                edgeGroups.set(key, []);
            }
            edgeGroups.get(key).push(edge);
        });

        const transformedEdges = rawEdges.map((edge) => {
            const key = `${edge.from}-${edge.to}`;
            const group = edgeGroups.get(key);
            const groupIndex = group.indexOf(edge);
            const groupSize = group.length;
            const curve = groupSize > 1 ? (groupIndex - (groupSize - 1) / 2) * 0.2 : 0;

            return {
                ...edge,
                edgeLabel: edge.label,
                source: edge.from,
                target: edge.to,
                curve: curve,
                groupIndex: groupIndex,
                groupSize: groupSize
            };
        });

        return {
            nodes: transformedNodes,
            links: transformedEdges,
        };
    }, [nodes, rawEdges, getSize, colors]);

    const handleNodeClick = useCallback((node: any) => {
        toggleNodeSelection(node, false);
    }, [toggleNodeSelection]);

    const handleBackgroundClick = useCallback(() => {
        clearSelectedNodes();
    }, [clearSelectedNodes]);

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

    const renderNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const size = node.nodeSize;
        
        if (shouldUseSimpleRendering) {
            // Simple circle rendering for large node counts
            ctx.beginPath();
            ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI);
            ctx.fillStyle = node.nodeColor;
            ctx.fill();
        } else {
            // Full rendering with icon and label
            ctx.beginPath();
            ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI);
            ctx.fillStyle = node.nodeColor;
            ctx.fill();

            // const img = new Image();
            // img.src = `./icons/${node.type}.svg` as any;
            // ctx.drawImage(img, node.x - size / 2, node.y - size / 2, size, size);

            if (globalScale > 3) {
                const label = node.nodeLabel || node.label || node.id;
                if (label) {
                    const fontSize = Math.max(2, size * 0.2);
                    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                    const textWidth = ctx.measureText(label).width;
                    const padding = 2;
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
                    ctx.lineWidth = 0.2;
                    const bgWidth = textWidth + padding * 2;
                    const bgHeight = fontSize + padding;
                    const bgX = node.x - bgWidth / 2;
                    const bgY = node.y + size / 2 + 1;
                    
                    ctx.beginPath();
                    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.fillStyle = theme === "dark" ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(label, node.x, bgY + bgHeight / 2);
                }
            }
        }
    }, [shouldUseSimpleRendering, theme]);

    // Set actions in store
    useEffect(() => {
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

    if (!nodes.length) {
        return <EmptyState />;
    }

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
                    linkCurvature={link => link.curve}
                    linkLabel={link => link.edgeLabel}
                    linkDirectionalParticles={link => link.__highlighted ? 2 : 0}
                    linkDirectionalParticleSpeed={0.005}
                    linkWidth={link => link.__highlighted ? 2 : link.__dimmed ? 0.5 : 1}
                    linkColor={link => {
                        if (link.__highlighted) return 'rgba(171, 171, 171, 0.23)';
                        if (link.__dimmed) return 'rgba(146, 146, 146, 0.33)';
                        return 'rgba(166, 166, 166, 0.32)';
                    }}
                    d3AlphaDecay={0.02}
                    d3VelocityDecay={0.3}
                    nodeCanvasObject={renderNode}
                    onNodeHover={(node: any) => {
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
                    backgroundColor="transparent"
                />
            </div>
        </div>
    );
};

export default GraphReactForce;



