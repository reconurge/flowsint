import React, { useCallback, useMemo, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphEdge, GraphNode, useGraphStore } from '@/stores/graph-store';
import { useNodesDisplaySettings } from '@/stores/node-display-settings';
import { useGraphControls } from '@/stores/graph-controls-store';
import type { ItemType } from '@/stores/node-display-settings';
import EmptyState from './empty-state';
import { useTheme } from '../theme-provider';
import ContextMenu from './wall/custom/context-menu';

interface GraphReactForceProps {
    style?: React.CSSProperties;
}

interface LabelBounds {
    x: number;
    y: number;
    width: number;
    height: number;
    nodeId: string;
    nodeSize: number;
}

const NODE_COUNT_THRESHOLD = 1000;
const ZOOM_MIN = 0.3;
const ZOOM_INTERVAL = 2;
const ZOOM_MAX = 10;
const ZOOM_THRESHOLD = 4;

const GraphReactForce: React.FC<GraphReactForceProps> = () => {
    const nodes = useGraphStore(s => s.nodes) as GraphNode[];
    const rawEdges = useGraphStore(s => s.edges) as GraphEdge[];
    const { theme } = useTheme();
    const getSize = useNodesDisplaySettings(s => s.getSize);
    const colors = useNodesDisplaySettings(s => s.colors) as Record<ItemType, string>;
    const toggleNodeSelection = useGraphStore(s => s.toggleNodeSelection);
    const clearSelectedNodes = useGraphStore(s => s.clearSelectedNodes);
    const setActions = useGraphControls(s => s.setActions);
    const [menu, setMenu] = useState<any>(null);
    const [currentZoom, setCurrentZoom] = useState(1);

    const shouldUseSimpleRendering = useMemo(() => {
        return nodes.length > NODE_COUNT_THRESHOLD || currentZoom < ZOOM_THRESHOLD;
    }, [nodes.length, currentZoom]);

    // Transform data for Force Graph
    const graphData = useMemo(() => {
        const transformedNodes = nodes.map(node => {
            const type = node.data?.type as ItemType;
            const color = colors[type] || '#0074D9';
            const size = getSize(type)-2;
            let nodeLabel = node.data.label;
            if (!nodeLabel && 'caption' in node) nodeLabel = (node as any).caption;
            if (!nodeLabel) nodeLabel = node.id;
            const randMin = ZOOM_MIN + Math.random() * (ZOOM_MAX - ZOOM_MIN - 1);
            const randMax = randMin + ZOOM_INTERVAL;
            return {
                ...node,
                nodeLabel: nodeLabel,
                nodeColor: color,
                nodeSize: size,
                nodeType: type,
                val: size,
                randMin: randMin,
                randMax: randMax
            };
        }).sort((a, b) => b.nodeSize - a.nodeSize); // Sort by size, largest first

        const edgeGroups = new Map();
        rawEdges.forEach(edge => {
            const key = `${edge.source}-${edge.target}`;
            if (!edgeGroups.has(key)) {
                edgeGroups.set(key, []);
            }
            edgeGroups.get(key).push(edge);
        });

        const transformedEdges = rawEdges.map((edge) => {
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
    }, [nodes, rawEdges, getSize, colors]);

    const handleNodeClick = useCallback((node: any) => {
        toggleNodeSelection(node, false);
    }, [toggleNodeSelection]);

    const handleBackgroundClick = useCallback(() => {
        clearSelectedNodes();
        setMenu(null)
    }, [clearSelectedNodes, setMenu]);

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

    // Helper functions for rendering
    const drawNodeCircle = useCallback((ctx: CanvasRenderingContext2D, node: any, size: number) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 0.65, 0, 2 * Math.PI);
        ctx.fillStyle = node.nodeColor;
        ctx.fill();
        
        // Add border with same color
        ctx.strokeStyle = node.nodeColor;
        ctx.lineWidth = 0.75;
        ctx.stroke();
    }, []);

    const drawNodeIcon = useCallback((ctx: CanvasRenderingContext2D, node: any, size: number, type: ItemType) => {
        // Draw circular border first
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 0.70, 0, 2 * Math.PI);
        ctx.strokeStyle = node.nodeColor;
        ctx.lineWidth = 0.75;
        ctx.stroke();
        
        // Draw icon on top
        const img = new Image();
        img.src = `/icons/${type}.svg`;
        ctx.drawImage(img, node.x - size / 2, node.y - size / 2, size, size);
    }, []);

    const shouldShowLabel = useCallback((globalScale: number, randMin: number, randMax: number) => {
        return globalScale >= randMin && globalScale <= randMax;
    }, []);

    // Check if two rectangles overlap
    const doLabelsOverlap = useCallback((bounds1: LabelBounds, bounds2: LabelBounds) => {
        return !(bounds1.x + bounds1.width < bounds2.x ||
            bounds2.x + bounds2.width < bounds1.x ||
            bounds1.y + bounds1.height < bounds2.y ||
            bounds2.y + bounds2.height < bounds1.y);
    }, []);

    const drawLabelBackground = useCallback((ctx: CanvasRenderingContext2D, node: any, label: string, fontSize: number) => {
        const textWidth = ctx.measureText(label).width;
        const padding = 6;
        const bgWidth = textWidth + padding * 2;
        const bgHeight = fontSize + padding;
        const bgX = node.x - bgWidth / 2;
        const bgY = node.y + node.nodeSize / 2 + 1;

        ctx.fillStyle = 'rgba(149, 149, 149, 0.56)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.lineWidth = 0.2;

        ctx.beginPath();
        ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 4);
        ctx.fill();
        ctx.stroke();

        return { bgX, bgY, bgHeight, bgWidth };
    }, []);

    const drawLabel = useCallback((ctx: CanvasRenderingContext2D, node: any, label: string, fontSize: number, bgY: number, bgHeight: number) => {
        ctx.fillStyle = theme === "dark" ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, bgY + bgHeight / 2);
    }, [theme]);

    // Efficient collision detection using spatial partitioning
    const collisionGridRef = React.useRef<Map<string, LabelBounds[]>>(new Map());
    const renderedLabelsRef = React.useRef<Set<string>>(new Set());
    const gridSize = 50;

    // Get all grid keys that a label bounds might overlap
    const getOverlappingGridKeys = useCallback((bounds: LabelBounds) => {
        const keys = new Set<string>();
        const startX = Math.floor(bounds.x / gridSize);
        const endX = Math.floor((bounds.x + bounds.width) / gridSize);
        const startY = Math.floor(bounds.y / gridSize);
        const endY = Math.floor((bounds.y + bounds.height) / gridSize);

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                keys.add(`${x},${y}`);
            }
        }
        return Array.from(keys);
    }, []);

    // Check for collisions using spatial partitioning with size-based priority
    const checkCollision = useCallback((newBounds: LabelBounds) => {
        const gridKeys = getOverlappingGridKeys(newBounds);

        for (const key of gridKeys) {
            const boundsInGrid = collisionGridRef.current.get(key) || [];
            for (const existingBounds of boundsInGrid) {
                if (doLabelsOverlap(newBounds, existingBounds)) {
                    // If the new label is from a larger node, it takes priority
                    if (newBounds.nodeSize > existingBounds.nodeSize) {
                        // Remove the smaller node's label from the grid
                        const updatedBounds = boundsInGrid.filter(b => b.nodeId !== existingBounds.nodeId);
                        collisionGridRef.current.set(key, updatedBounds);
                        renderedLabelsRef.current.delete(existingBounds.nodeId);
                        continue; // Check other bounds in this grid
                    } else {
                        // New label is from a smaller node, so it gets rejected
                        return true;
                    }
                }
            }
        }
        return false;
    }, [getOverlappingGridKeys, doLabelsOverlap]);

    // Add bounds to spatial grid
    const addBoundsToGrid = useCallback((bounds: LabelBounds) => {
        const gridKeys = getOverlappingGridKeys(bounds);
        for (const key of gridKeys) {
            if (!collisionGridRef.current.has(key)) {
                collisionGridRef.current.set(key, []);
            }
            collisionGridRef.current.get(key)!.push(bounds);
        }
    }, [getOverlappingGridKeys]);

    // Custom renderer with efficient collision detection
    const renderNodeWithCollisionDetection = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const type = node.nodeType as ItemType;
        const label = node.nodeLabel || node.label || node.id;

        // Always render the node itself
        if (shouldUseSimpleRendering) {
            drawNodeCircle(ctx, node, node.nodeSize);
        } else {
            drawNodeIcon(ctx, node, node.nodeSize, type);
        }

        // Check if we should show a label
        if (!shouldShowLabel(globalScale, node.randMin, node.randMax)) return;

        // Determine font size based on zoom level
        let fontSize: number;
        if (shouldUseSimpleRendering) {
            fontSize = Math.max(8, 14 / globalScale);
        } else {
            if (globalScale > 3) {
                fontSize = Math.max(2, node.nodeSize * 0.4);
            } else {
                fontSize = Math.max(8, 14 / globalScale);
            }
        }

        // Set font for measurement
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

        // Measure text to check for collisions
        const textWidth = ctx.measureText(label).width;
        const padding = 2;
        const bgWidth = textWidth + padding * 2;
        const bgHeight = fontSize + padding;
        const bgX = node.x - bgWidth / 2;
        const bgY = node.y + node.nodeSize / 2 + 1;

        const newLabelBounds: LabelBounds = {
            x: bgX,
            y: bgY,
            width: bgWidth,
            height: bgHeight,
            nodeId: node.id,
            nodeSize: node.nodeSize
        };

        // Check if this label was previously rendered
        const wasPreviouslyRendered = renderedLabelsRef.current.has(node.id);

        // If not previously rendered, check for collisions
        if (!wasPreviouslyRendered) {
            if (checkCollision(newLabelBounds)) {
                return; // Don't render this label
            }
            // Add this label to the spatial grid
            addBoundsToGrid(newLabelBounds);
            // Mark as rendered
            renderedLabelsRef.current.add(node.id);
        }

        // Render the label background and text
        if (shouldUseSimpleRendering || globalScale > 3) {
            // Draw background for detailed labels
            const { bgY: finalBgY, bgHeight: finalBgHeight } = drawLabelBackground(ctx, node, label, fontSize);
            drawLabel(ctx, node, label, fontSize, finalBgY, finalBgHeight);
        } else {
            // Draw simple label without background
            ctx.fillStyle = theme === "dark" ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, node.x, node.y);
        }
    }, [shouldUseSimpleRendering, drawNodeCircle, drawNodeIcon, shouldShowLabel, checkCollision, addBoundsToGrid, drawLabelBackground, drawLabel, theme]);

    // Reset collision grid and rendered labels only when nodes change
    useEffect(() => {
        collisionGridRef.current.clear();
        renderedLabelsRef.current.clear();
    }, [nodes.length, nodes.map(n => n.id).join(',')]); // Also reset when node IDs change

    // Reset only when zoom changes significantly
    const lastZoomRef = React.useRef(currentZoom);
    useEffect(() => {
        const zoomDiff = Math.abs(currentZoom - lastZoomRef.current);
        if (zoomDiff > 0.5) {
            collisionGridRef.current.clear();
            renderedLabelsRef.current.clear();
            lastZoomRef.current = currentZoom;
        }
    }, [currentZoom]);

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

    const onNodeContextMenu = useCallback(
        (data: any, event: MouseEvent) => {
            if (!containerRef.current) return;
            const pane = containerRef.current.getBoundingClientRect();
            const relativeX = event.clientX - pane.left;
            const relativeY = event.clientY - pane.top;
            const menuWidth = 320;
            const menuHeight = 250;
            const padding = 20;

            const wouldOverflowRight = relativeX + menuWidth + padding > pane.width;
            const wouldOverflowBottom = relativeY + menuHeight + padding > pane.height;

            let finalTop = 0;
            let finalLeft = 0;
            let finalRight = 0;
            let finalBottom = 0;

            if (wouldOverflowRight) {
                finalRight = pane.width - relativeX;
            } else {
                finalLeft = relativeX;
            }

            if (wouldOverflowBottom) {
                finalBottom = pane.height - relativeY;
            } else {
                finalTop = relativeY;
            }

            setMenu({
                node: { data: data.data, id: data.id, label: data.label, position: data.position } as GraphNode,
                top: finalTop,
                left: finalLeft,
                right: finalRight,
                bottom: finalBottom,
                wrapperWidth: pane.width,
                wrapperHeight: pane.height,
                setMenu: setMenu,
            });
        },
        [setMenu],
    );

    if (!nodes.length) {
        return <EmptyState />;
    }

    return (
        <div className="relative h-full grow w-full bg-background">
            {/* {currentZoom} */}
            <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 300, minWidth: 300 }}>
                <ForceGraph2D
                    ref={graphRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={graphData}
                    nodeLabel="label"
                    nodeColor={node => shouldUseSimpleRendering ? node.nodeColor : "#00000000"}
                    nodeRelSize={6}
                    enableNodeDrag={false}
                    linkDirectionalArrowLength={3.5}
                    linkDirectionalArrowRelPos={1}
                    cooldownTicks={100}
                    onNodeRightClick={onNodeContextMenu}
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
                    nodeCanvasObject={renderNodeWithCollisionDetection}
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
                    onZoom={(zoom) => setCurrentZoom(zoom.k)}
                />

                {menu && <ContextMenu
                    onClick={handleBackgroundClick}
                    {...menu}
                />}
            </div>
        </div>
    );
};

export default GraphReactForce;



