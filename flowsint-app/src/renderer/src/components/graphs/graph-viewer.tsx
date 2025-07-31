import { getDagreLayoutedElements } from '@/lib/utils';
import { useGraphControls } from '@/stores/graph-controls-store';
import { useGraphSettingsStore } from '@/stores/graph-settings-store';
import { GraphNode, GraphEdge, useGraphStore } from '@/stores/graph-store';
import { ItemType, useNodesDisplaySettings } from '@/stores/node-display-settings';
import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Button } from '../ui/button';
import { useTheme } from '@/components/theme-provider'

interface GraphViewerProps {
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
const CONSTANTS = {
    NODE_DEFAULT_SIZE: 24,
    LABEL_FONT_SIZE: 2.5,
    NODE_FONT_SIZE: 5,
    LABEL_NODE_MARGIN: 18,
    PADDING_RATIO: 0.2,
    HALF_PI: Math.PI / 2,
    PI: Math.PI,
    MEASURE_FONT: '1px Sans-Serif',
    MIN_FONT_SIZE: 0.5,
    LINK_COLOR: 'rgba(128, 128, 128, 0.6)',
    LINK_WIDTH: 1,
    ARROW_SIZE: 8,
    ARROW_ANGLE: Math.PI / 6
};

// Pre-computed constants
const LABEL_FONT_STRING = `${CONSTANTS.LABEL_FONT_SIZE}px Sans-Serif`;

// Reusable objects to avoid allocations
const tempPos = { x: 0, y: 0 };
const tempDimensions = [0, 0];

const GraphViewer: React.FC<GraphViewerProps> = ({
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

    // Store references
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<any>();
    const isGraphReadyRef = useRef(false);

    // Store selectors
    const nodeColors = useNodesDisplaySettings(s => s.colors);
    const getSize = useNodesDisplaySettings(s => s.getSize);
    const settings = useGraphSettingsStore(s => s.settings);
    const view = useGraphControls(s => s.view);
    const setActions = useGraphControls(s => s.setActions);
    const { theme } = useTheme();
    const setOpenMainDialog = useGraphStore(state => state.setOpenMainDialog);

    // Optimized graph initialization callback
    const initializeGraph = useCallback((graphInstance: any) => {
        if (!graphInstance || isGraphReadyRef.current) return;
        isGraphReadyRef.current = true;
        // Set up graph actions
        setActions({
            zoomIn: () => {
                const zoom = graphInstance.zoom();
                graphInstance.zoom(zoom * 1.5);
            },
            zoomOut: () => {
                const zoom = graphInstance.zoom();
                graphInstance.zoom(zoom * 0.75);
            },
            zoomToFit: () => {
                graphInstance.zoomToFit(400);
            }
        });

        // Call external ref callback
        onGraphRef?.(graphInstance);
    }, [setActions, onGraphRef]);

    // Handle graph ref changes
    useEffect(() => {
        if (graphRef.current) {
            initializeGraph(graphRef.current);
        }
    }, [initializeGraph]);

    // Memoized rendering check
    const shouldUseSimpleRendering = useMemo(() =>
        nodes.length > NODE_COUNT_THRESHOLD || currentZoom < 2.5
        , [nodes.length, currentZoom]);

    // Optimized graph data transformation
    const graphData = useMemo(() => {
        // Transform nodes
        const transformedNodes = nodes.map(node => {
            const type = node.data?.type as ItemType;
            return {
                ...node,
                nodeLabel: node.data?.label || node.id,
                nodeColor: nodeColors[type] || '#0074D9',
                nodeSize: CONSTANTS.NODE_DEFAULT_SIZE,
                nodeType: type,
                val: getSize(type),
            };
        });

        // Group and transform edges
        const edgeGroups = new Map<string, GraphEdge[]>();
        edges.forEach(edge => {
            const key = `${edge.source}-${edge.target}`;
            if (!edgeGroups.has(key)) {
                edgeGroups.set(key, []);
            }
            edgeGroups.get(key)!.push(edge);
        });

        const transformedEdges = edges.map((edge) => {
            const key = `${edge.source}-${edge.target}`;
            const group = edgeGroups.get(key)!;
            const groupIndex = group.indexOf(edge);
            const groupSize = group.length;
            const curve = groupSize > 1 ? (groupIndex - (groupSize - 1) / 2) * 0.2 : 0;

            return {
                ...edge,
                edgeLabel: edge.label,
                curve,
                groupIndex,
                groupSize
            };
        });

        // Handle hierarchy layout
        if (view === "hierarchy") {
            const { nodes: nds, edges: eds } = getDagreLayoutedElements(transformedNodes, transformedEdges);
            return {
                nodes: nds.map((nd) => ({ ...nd, x: nd.position.x, y: nd.position.y })),
                links: eds,
            };
        }

        return {
            nodes: transformedNodes,
            links: transformedEdges,
        };
    }, [nodes, edges, nodeColors, getSize, view]);

    // Event handlers
    const handleNodeClick = useCallback((node: any) => onNodeClick?.(node), [onNodeClick]);
    const handleNodeRightClick = useCallback((node: any, event: MouseEvent) => onNodeRightClick?.(node, event), [onNodeRightClick]);
    const handleBackgroundClick = useCallback(() => onBackgroundClick?.(), [onBackgroundClick]);
    const handleOpenNewActionDialog = useCallback(() => setOpenMainDialog(true), [setOpenMainDialog]);

    // Optimized node rendering
    const renderNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const size = node.nodeSize * (settings.nodeSize.value / 50);

        // Always draw the basic circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 0.65, 0, 2 * Math.PI);
        ctx.fillStyle = node.nodeColor;
        ctx.fill();

        // Early exit for simple rendering
        if (shouldUseSimpleRendering) return;

        // Icon rendering
        if (showIcons) {
            const img = new Image();
            img.src = `/icons/${node.nodeType}.svg`;
            ctx.drawImage(img, node.x - size / 2, node.y - size / 2, size, size);
        }

        // Label rendering
        if (showLabels && globalScale > 3) {
            const label = node.nodeLabel || node.label || node.id;
            if (label) {
                const fontSize = CONSTANTS.NODE_FONT_SIZE * (size / 10);
                ctx.font = `${fontSize}px Sans-Serif`
                const bgHeight = CONSTANTS.NODE_FONT_SIZE + 2;
                const bgY = node.y + size / 2 + 1;

                ctx.fillStyle = theme === "light" ? '#161616' : '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, node.x, bgY + bgHeight / 2);
            }
        }
    }, [shouldUseSimpleRendering, showLabels, showIcons, settings.nodeSize.value, theme]);

    // Optimized link rendering
    const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
        const { source: start, target: end } = link;

        // Early exit for unbound links
        if (typeof start !== 'object' || typeof end !== 'object') return;

        // Draw connection line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = CONSTANTS.LINK_COLOR;
        ctx.lineWidth = CONSTANTS.LINK_WIDTH * (settings.linkWidth.value / 5);
        ctx.stroke();

        // Early exit for simple rendering or no label
        if (shouldUseSimpleRendering || !link.label) return;

        // Calculate label position and angle
        tempPos.x = (start.x + end.x) * 0.5;
        tempPos.y = (start.y + end.y) * 0.5;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        let textAngle = Math.atan2(dy, dx);

        // Flip text for readability
        if (textAngle > CONSTANTS.HALF_PI || textAngle < -CONSTANTS.HALF_PI) {
            textAngle += textAngle > 0 ? -CONSTANTS.PI : CONSTANTS.PI;
        }

        // Measure and draw label
        ctx.font = LABEL_FONT_STRING;
        const textWidth = ctx.measureText(link.label).width;
        const padding = CONSTANTS.LABEL_FONT_SIZE * CONSTANTS.PADDING_RATIO;

        tempDimensions[0] = textWidth + padding;
        tempDimensions[1] = CONSTANTS.LABEL_FONT_SIZE + padding;

        const halfWidth = tempDimensions[0] * 0.5;
        const halfHeight = tempDimensions[1] * 0.5;

        // Batch canvas operations
        ctx.save();
        ctx.translate(tempPos.x, tempPos.y);
        ctx.rotate(textAngle);

        // Background
        ctx.fillStyle = theme === "light" ? "#FFFFFF" : '#161616';
        ctx.fillRect(-halfWidth, -halfHeight, tempDimensions[0], tempDimensions[1]);

        // Text
        ctx.fillStyle = 'darkgrey';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(link.label, 0, 0);

        ctx.restore();
    }, [shouldUseSimpleRendering, settings.linkWidth.value, theme]);

    // Container resize observer
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            const { width: w, height: h } = entries[0].contentRect;
            setDimensions({ width: w, height: h });
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Restart simulation when settings change
    useEffect(() => {
        if (graphRef.current && isGraphReadyRef.current) {
            graphRef.current.d3ReheatSimulation();
        }
    }, [settings]);

    // Empty state
    if (!nodes.length) {
        return (
            <div className={`flex h-full w-full items-center justify-center ${className}`} style={style}>
                <div className="text-center text-muted-foreground max-w-md mx-auto p-6">
                    <div className="mb-4">
                        <svg
                            className="mx-auto h-16 w-16 text-muted-foreground/50"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No data to visualize
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Start your investigation by adding nodes to see them displayed in the graph view.
                    </p>
                    <div className="space-y-2 text-xs text-muted-foreground mb-6">
                        <p><strong>Tip:</strong> Use the search bar to find entities or import data to get started</p>
                        <p><strong>Explore:</strong> Try searching for domains, emails, or other entities</p>
                    </div>
                    <Button onClick={handleOpenNewActionDialog}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add your first item
                    </Button>
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
                onNodeRightClick={handleNodeRightClick}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                linkCurvature={link => link.curve}
                linkDirectionalParticles={link => link.__highlighted ? 2 : 0}
                nodeCanvasObject={renderNode}
                onNodeDragEnd={(node => {
                    node.fx = node.x;
                    node.fy = node.y;
                })}
                cooldownTicks={view === "hierarchy" ? 0 : settings.cooldownTicks?.value}
                cooldownTime={settings.cooldownTime?.value}
                d3AlphaDecay={settings.d3AlphaDecay?.value}
                d3AlphaMin={settings.d3AlphaMin?.value}
                d3VelocityDecay={settings.d3VelocityDecay?.value}
                warmupTicks={settings.warmupTicks?.value}
                dagLevelDistance={settings.dagLevelDistance?.value}
                linkDirectionalArrowRelPos={settings.linkDirectionalArrowRelPos?.value}
                linkDirectionalArrowLength={settings.linkDirectionalArrowLength?.value}
                linkDirectionalParticleSpeed={settings.linkDirectionalParticleSpeed?.value}
                backgroundColor={backgroundColor}
                onZoom={(zoom) => setCurrentZoom(zoom.k)}
                linkCanvasObject={linkCanvasObject}
                enableNodeDrag={!shouldUseSimpleRendering}
            />
        </div>
    );
};

export default GraphViewer;