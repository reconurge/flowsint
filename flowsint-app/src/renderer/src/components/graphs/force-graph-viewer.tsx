import { ItemType, useNodesDisplaySettings } from '@/stores/node-display-settings';
import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export interface GraphNode {
    id: string;
    data?: {
        type?: string;
        label?: string;
    };
    label?: string;
    position?: { x: number; y: number };
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
}

interface ForceGraphViewerProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    width?: number;
    height?: number;
    nodeColors?: Record<string, string>;
    nodeSizes?: Record<string, number>;
    onNodeClick?: (node: GraphNode) => void;
    onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void;
    onBackgroundClick?: () => void;
    showLabels?: boolean;
    showIcons?: boolean;
    backgroundColor?: string;
    className?: string;
    style?: React.CSSProperties;
    onGraphRef?: (ref: any) => void;
}

const NODE_COUNT_THRESHOLD = 500;

const ForceGraphViewer: React.FC<ForceGraphViewerProps> = ({
    nodes,
    edges,
    width,
    height,
    onNodeClick,
    onNodeRightClick,
    onBackgroundClick,
    showLabels = true,
    showIcons = true,
    backgroundColor = 'transparent',
    className = '',
    style,
    onGraphRef
}) => {
    const [currentZoom, setCurrentZoom] = useState(1);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const nodeColors = useNodesDisplaySettings(s => s.colors)
    const getSize = useNodesDisplaySettings(s => s.getSize);
    // Call onGraphRef when graphRef changes
    useEffect(() => {
        if (onGraphRef && graphRef.current) {
            onGraphRef(graphRef.current);
        }
    }, [onGraphRef]);
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<any>();

    const shouldUseSimpleRendering = useMemo(() => {
        return nodes.length > NODE_COUNT_THRESHOLD || currentZoom < 2.5;
    }, [nodes.length, currentZoom]);

    // Transform data for Force Graph
    const graphData = useMemo(() => {
        const transformedNodes = nodes.map(node => {
            const type = node.data?.type as ItemType;
            const color = nodeColors[type] || '#0074D9';
            const size = getSize(type);
            let nodeLabel = node.data?.label || node.label || node.id;

            return {
                ...node,
                nodeLabel: nodeLabel,
                nodeColor: color,
                nodeSize: size,
                nodeType: type,
                val: size,
            };
        });

        const edgeGroups = new Map();
        edges.forEach(edge => {
            const key = `${edge.source}-${edge.target}`;
            if (!edgeGroups.has(key)) {
                edgeGroups.set(key, []);
            }
            edgeGroups.get(key).push(edge);
        });

        const transformedEdges = edges.map((edge) => {
            const key = `${edge.source}-${edge.target}`;
            const group = edgeGroups.get(key);
            const groupIndex = group.indexOf(edge);
            const groupSize = group.length;
            const curve = groupSize > 1 ? (groupIndex - (groupSize - 1) / 2) * 0.2 : 0;

            return {
                ...edge,
                edgeLabel: edge.label,
                curve: curve,
                groupIndex: groupIndex,
                groupSize: groupSize
            };
        });

        return {
            nodes: transformedNodes,
            links: transformedEdges,
        };
    }, [nodes, edges, nodeColors, getSize]);

    const handleNodeClick = useCallback((node: any) => {
        if (onNodeClick) {
            onNodeClick(node);
        }
    }, [onNodeClick]);

    const handleNodeRightClick = useCallback((node: any, event: MouseEvent) => {
        if (onNodeRightClick) {
            onNodeRightClick(node, event);
        }
    }, [onNodeRightClick]);

    const handleBackgroundClick = useCallback(() => {
        if (onBackgroundClick) {
            onBackgroundClick();
        }
    }, [onBackgroundClick]);

    const renderNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const size = node.nodeSize;
        const type = node.nodeType;

        if (shouldUseSimpleRendering) {
            // Simple circle rendering for large node counts
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * 0.65, 0, 2 * Math.PI);
            ctx.fillStyle = node.nodeColor;
            ctx.fill();
        } else {
            // Full rendering with icon and label
            ctx.beginPath();
            ctx.fillStyle = node.nodeColor;
            ctx.fill();

            if (showIcons) {
                const img = new Image();
                img.src = `/icons/${type}.svg`;
                ctx.drawImage(img, node.x - size / 2, node.y - size / 2, size, size);
            }

            if (showLabels && globalScale > 3) {
                const label = node.nodeLabel || node.label || node.id;
                if (label) {
                    const fontSize = Math.max(2, size * 0.4);
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
                    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 0.75);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = 'rgb(0, 0, 0)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(label, node.x, bgY + bgHeight / 2);
                }
            }
        }
    }, [shouldUseSimpleRendering, showLabels, showIcons]);

    // Handle container resize
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            const { width: w, height: h } = entries[0].contentRect;
            setDimensions({ width: w, height: h });
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
        return (
            <div className={`flex items-center justify-center ${className}`} style={style}>
                <div className="text-center text-muted-foreground">
                    <p>No nodes to display</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={className}
            data-graph-container
            style={{
                width: width || '100%',
                height: height || '100%',
                minHeight: 300,
                minWidth: 300,
                ...style
            }}
        >
            <ForceGraph2D
                ref={graphRef}
                width={dimensions.width || width}
                height={dimensions.height || height}
                graphData={graphData}
                nodeLabel="label"
                nodeColor={node => shouldUseSimpleRendering ? node.nodeColor : "#00000000"}
                nodeRelSize={6}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                cooldownTicks={100}
                onNodeRightClick={handleNodeRightClick}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                linkCurvature={link => link.curve}
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
                backgroundColor={backgroundColor}
                onZoom={(zoom) => setCurrentZoom(zoom.k)}
            />
        </div>
    );
};

export default ForceGraphViewer; 