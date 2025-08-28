import { getDagreLayoutedElements } from '@/lib/utils';
import { useGraphControls } from '@/stores/graph-controls-store';
import { useGraphSettingsStore } from '@/stores/graph-settings-store';
import { useGraphStore } from '@/stores/graph-store';
import { ItemType, useNodesDisplaySettings } from '@/stores/node-display-settings';
import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Button } from '../ui/button';
import { useTheme } from '@/components/theme-provider'
import { GRAPH_COLORS } from '../flows/scanner-data';
import { Share2, Type } from 'lucide-react';
import Lasso from './lasso';
import { GraphNode, GraphEdge } from '@/types';

function truncateText(text: string, limit: number = 16) {
    if (text.length <= limit)
        return text
    return text.substring(0, limit) + "..."
}

interface GraphViewerProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    // Remove width and height props - component will handle its own sizing
    nodeColors?: Record<string, string>;
    nodeSizes?: Record<string, number>;
    onNodeClick?: (node: GraphNode, event: MouseEvent) => void;
    onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void;
    onBackgroundClick?: () => void;
    showLabels?: boolean;
    showIcons?: boolean;
    backgroundColor?: string;
    className?: string;
    style?: React.CSSProperties;
    onGraphRef?: (ref: any) => void;
    instanceId?: string; // Add instanceId prop for instance-specific actions
    allowLasso?: boolean
}

const CONSTANTS = {
    NODE_COUNT_THRESHOLD: 500,
    NODE_DEFAULT_SIZE: 10,
    NODE_LABEL_FONT_SIZE: 3.5,
    LABEL_FONT_SIZE: 2.5,
    NODE_FONT_SIZE: 3.5,
    LABEL_NODE_MARGIN: 18,
    PADDING_RATIO: 0.2,
    HALF_PI: Math.PI / 2,
    PI: Math.PI,
    MEASURE_FONT: '1px Sans-Serif',
    MIN_FONT_SIZE: 0.5,
    LINK_WIDTH: 1,
    ARROW_SIZE: 8,
    ARROW_ANGLE: Math.PI / 6,
    // New constants for layered label display
    LABEL_LAYERS: [
        { minZoom: 1.5, minWeight: 15, maxNodes: 20 },    // High-weight nodes first
        { minZoom: 2.0, minWeight: 10, maxNodes: 50 },    // Medium-weight nodes
        { minZoom: 2.5, minWeight: 5, maxNodes: 100 },    // Lower-weight nodes
        { minZoom: 3.0, minWeight: 1, maxNodes: 200 },    // All remaining nodes
        { minZoom: 4.0, minWeight: 0, maxNodes: Infinity } // All nodes at high zoom
    ]
};

// Pre-computed constants
const LABEL_FONT_STRING = `${CONSTANTS.LABEL_FONT_SIZE}px Sans-Serif`;

// Reusable objects to avoid allocations
const tempPos = { x: 0, y: 0 };
const tempDimensions = [0, 0];

// Image cache for icons
const imageCache = new Map<string, HTMLImageElement>();
const imageLoadPromises = new Map<string, Promise<HTMLImageElement>>();

// Preload icon images
const preloadImage = (iconType: string): Promise<HTMLImageElement> => {
    const cacheKey = iconType;
    // Return cached image if available
    if (imageCache.has(cacheKey)) {
        return Promise.resolve(imageCache.get(cacheKey)!);
    }
    // Return existing promise if already loading
    if (imageLoadPromises.has(cacheKey)) {
        return imageLoadPromises.get(cacheKey)!;
    }
    // Create new loading promise
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            imageCache.set(cacheKey, img);
            imageLoadPromises.delete(cacheKey);
            resolve(img);
        };
        img.onerror = () => {
            imageLoadPromises.delete(cacheKey);
            reject(new Error(`Failed to load icon: ${iconType}`));
        };
        img.src = `/icons/${iconType}.svg`;
    });
    imageLoadPromises.set(cacheKey, promise);
    return promise;
};

const GraphViewer: React.FC<GraphViewerProps> = ({
    nodes,
    edges,
    // Remove width and height from destructuring
    onNodeClick,
    onNodeRightClick,
    onBackgroundClick,
    showLabels = true,
    showIcons = true,
    backgroundColor = 'transparent',
    className = '',
    style,
    onGraphRef,
    instanceId,
    allowLasso = false
}) => {
    const [currentZoom, setCurrentZoom] = useState(1);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const isLassoActive = useGraphControls(s => s.isLassoActive)
    // Hover highlighting state
    const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
    const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
    const [hoverNode, setHoverNode] = useState<string | null>(null);

    // Store references
    const graphRef = useRef<any>();
    const containerRef = useRef<HTMLDivElement>(null);
    const isGraphReadyRef = useRef(false);
    const lastRenderTimeRef = useRef<number>(0);
    const renderThrottleRef = useRef<number | null>(null);

    // Store selectors
    const nodeColors = useNodesDisplaySettings(s => s.colors);
    const getSize = useNodesDisplaySettings(s => s.getSize);
    const settings = useGraphSettingsStore(s => s.settings);
    const view = useGraphControls(s => s.view);
    const setActions = useGraphControls(s => s.setActions);
    const currentNode = useGraphStore(s => s.currentNode)
    const selectedNodes = useGraphStore(s => s.selectedNodes)
    const { theme } = useTheme();
    const setOpenMainDialog = useGraphStore(state => state.setOpenMainDialog);

    const graph2ScreenCoords = useCallback((node: GraphNode) => {
        return graphRef.current.graph2ScreenCoords(node.x, node.y);
    }, [graphRef.current])

    const isCurrent = useCallback(
        (nodeId: string) => {
            return currentNode?.id === nodeId
        },
        [currentNode],
    )

    const isSelected = useCallback(
        (nodeId: string) => {
            return selectedNodes.some((node) => node.id === nodeId)
        },
        [selectedNodes],
    )

    // Preload icons when nodes change
    useEffect(() => {
        if (showIcons) {
            const iconTypes = new Set(nodes.map(node => node.data?.type as ItemType).filter(Boolean));
            iconTypes.forEach(type => {
                preloadImage(type).catch(console.warn); // Silently handle failures
            });
        }
    }, [nodes, showIcons]);

    // Optimized graph initialization callback
    const initializeGraph = useCallback((graphInstance: any) => {
        if (!graphInstance) return;

        // Check if the graph instance has the required methods
        if (typeof graphInstance.zoom !== 'function' || typeof graphInstance.zoomToFit !== 'function') {
            // If methods aren't available yet, retry after a short delay
            setTimeout(() => {
                if (graphRef.current && !isGraphReadyRef.current) {
                    initializeGraph(graphRef.current);
                }
            }, 100);
            return;
        }

        if (isGraphReadyRef.current) return;
        isGraphReadyRef.current = true;

        // Only set global actions if no instanceId is provided (for main graph)
        if (!instanceId) {
            setActions({
                zoomIn: () => {
                    if (graphRef.current && typeof graphRef.current.zoom === 'function') {
                        const zoom = graphRef.current.zoom();
                        graphRef.current.zoom(zoom * 1.5);
                    }
                },
                zoomOut: () => {
                    if (graphRef.current && typeof graphRef.current.zoom === 'function') {
                        const zoom = graphRef.current.zoom();
                        graphRef.current.zoom(zoom * 0.75);
                    }
                },
                zoomToFit: () => {
                    if (graphRef.current && typeof graphRef.current.zoomToFit === 'function') {
                        graphRef.current.zoomToFit(400);
                    }
                }
            });
        }

        // Call external ref callback
        onGraphRef?.(graphInstance);
    }, [setActions, onGraphRef, instanceId]);

    // Handle graph ref changes and ensure actions are set up
    useEffect(() => {
        if (graphRef.current) {
            initializeGraph(graphRef.current);
        }

        // Cleanup: reset actions when component unmounts (only for main graph)
        return () => {
            if (!instanceId && isGraphReadyRef.current) {
                setActions({
                    zoomIn: () => { },
                    zoomOut: () => { },
                    zoomToFit: () => { },
                });
                isGraphReadyRef.current = false;
            }
        };
    }, [initializeGraph]);

    // Additional effect to ensure actions are set up when graph is ready
    useEffect(() => {
        if (graphRef.current && !instanceId && !isGraphReadyRef.current) {
            // Try to initialize again if the graph is available but not marked as ready
            initializeGraph(graphRef.current);
        }
    }, [graphRef.current, initializeGraph, instanceId]);

    // Handle container size changes
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerSize({
                    width: rect.width,
                    height: rect.height
                });
            }
        };

        // Initial size
        updateSize();

        // Set up resize observer
        const resizeObserver = new ResizeObserver(updateSize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        // Also listen for window resize events
        window.addEventListener('resize', updateSize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    // Memoized rendering check
    const shouldUseSimpleRendering = useMemo(() =>
        nodes.length > CONSTANTS.NODE_COUNT_THRESHOLD || currentZoom < 1.5
        , [nodes.length, currentZoom]);

    // Memoized graph data transformation with proper memoization dependencies
    const graphData = useMemo(() => {
        // Transform nodes
        const transformedNodes = nodes.map(node => {
            const type = node.data?.type as ItemType;
            return {
                ...node,
                nodeLabel: node.data?.label || node.id,
                nodeColor: nodeColors[type] || GRAPH_COLORS.NODE_DEFAULT,
                nodeSize: CONSTANTS.NODE_DEFAULT_SIZE,
                nodeType: type,
                val: CONSTANTS.NODE_DEFAULT_SIZE,
                neighbors: [] as any[],
                links: [] as any[]
            } as GraphNode & { neighbors: any[]; links: any[] };
        });
        // Create a map for quick node lookup
        const nodeMap = new Map(transformedNodes.map(node => [node.id, node]));
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

        // Build node relationships (neighbors and links)
        transformedEdges.forEach(link => {
            const sourceNode = nodeMap.get(link.source);
            const targetNode = nodeMap.get(link.target);

            if (sourceNode && targetNode) {
                // Add neighbors
                if (!sourceNode.neighbors.includes(targetNode)) {
                    sourceNode.neighbors.push(targetNode);
                }
                if (!targetNode.neighbors.includes(sourceNode)) {
                    targetNode.neighbors.push(sourceNode);
                }

                // Add links
                sourceNode.links.push(link);
                targetNode.links.push(link);
            }
        });

        // Handle hierarchy layout
        if (view === "hierarchy") {
            const { nodes: nds, edges: eds } = getDagreLayoutedElements(transformedNodes, transformedEdges);
            return {
                nodes: nds.map((nd) => ({
                    ...nd,
                    // Preserve the neighbors and links from the original transformed node
                    neighbors: nodeMap.get(nd.id)?.neighbors || [],
                    links: nodeMap.get(nd.id)?.links || []
                })),
                links: eds,
            };
        }
        return {
            nodes: transformedNodes,
            links: transformedEdges,
        };
    }, [nodes, edges, nodeColors, getSize, view]);

    // Retry initialization if graph data changes and actions aren't set up
    useEffect(() => {
        if (graphData.nodes.length > 0 && graphRef.current && !instanceId && !isGraphReadyRef.current) {
            // Small delay to ensure the graph has rendered
            const timeoutId = setTimeout(() => {
                if (graphRef.current && !isGraphReadyRef.current) {
                    initializeGraph(graphRef.current);
                }
            }, 200);

            return () => clearTimeout(timeoutId);
        }
        return undefined;
    }, [graphData.nodes.length, initializeGraph, instanceId]);


    // New function to determine which labels should be visible based on zoom and weight
    const getVisibleLabels = useMemo(() => {
        if (!showLabels) return new Set<string>();

        // Find the appropriate layer for current zoom
        const currentLayer = CONSTANTS.LABEL_LAYERS.find(layer => currentZoom >= layer.minZoom);
        if (!currentLayer) return new Set<string>();

        // Sort nodes by weight (number of connections) in descending order
        const sortedNodes = [...graphData.nodes].sort((a, b) => {
            const aWeight = a.neighbors?.length || 0;
            const bWeight = b.neighbors?.length || 0;
            return bWeight - aWeight; // Higher weight first
        });

        // Take only the nodes that meet the criteria for this layer
        const visibleNodes = sortedNodes
            .filter(node => {
                const weight = node.neighbors?.length || 0;
                return weight >= currentLayer.minWeight;
            })
            .slice(0, currentLayer.maxNodes);

        return new Set(visibleNodes.map(node => node.id));
    }, [graphData.nodes, currentZoom, showLabels]);

    // Event handlers with proper memoization
    const handleNodeClick = useCallback((node: any, event: MouseEvent) => {
        onNodeClick?.(node, event);
    }, [onNodeClick]);

    const handleNodeRightClick = useCallback((node: any, event: MouseEvent) => {
        onNodeRightClick?.(node, event);
    }, [onNodeRightClick]);

    const handleBackgroundClick = useCallback(() => {
        onBackgroundClick?.();
    }, [onBackgroundClick]);

    const handleOpenNewAddItemDialog = useCallback(() => {
        setOpenMainDialog(true);
    }, [setOpenMainDialog]);

    // Throttled hover handlers to reduce excessive re-renders
    const handleNodeHover = useCallback((node: any) => {
        // Throttle hover updates to max 60fps
        const now = Date.now();
        if (now - lastRenderTimeRef.current < 16) { // ~60fps
            if (renderThrottleRef.current) {
                clearTimeout(renderThrottleRef.current);
            }
            renderThrottleRef.current = setTimeout(() => {
                handleNodeHover(node);
            }, 16) as any;
            return;
        }
        lastRenderTimeRef.current = now;
        const newHighlightNodes = new Set<string>();
        const newHighlightLinks = new Set<string>();
        if (node) {
            // Add the hovered node
            newHighlightNodes.add(node.id);
            // Add connected nodes and links
            if (node.neighbors) {
                node.neighbors.forEach((neighbor: any) => {
                    newHighlightNodes.add(neighbor.id);
                });
            }
            if (node.links) {
                node.links.forEach((link: any) => {
                    newHighlightLinks.add(`${link.source.id}-${link.target.id}`);
                });
            }
            setHoverNode(node.id);
        } else {
            setHoverNode(null);
        }
        setHighlightNodes(newHighlightNodes);
        setHighlightLinks(newHighlightLinks);
    }, []);

    // Add state for tooltip
    const [tooltip, setTooltip] = useState<{
        x: number;
        y: number;
        data: {
            label: string,
            connections: string
            type: string
        } | null;
        visible: boolean;
    }>({
        x: 0,
        y: 0,
        data: null,
        visible: false
    });

    // Enhanced node hover with tooltip
    const handleNodeHoverWithTooltip = useCallback((node: any) => {
        if (node) {
            const weight = node.neighbors?.length || 0;
            const label = node.nodeLabel || node.label || node.id;

            // Position tooltip above the node using the graph's coordinate conversion
            if (graphRef.current) {
                try {
                    // Use the graph's built-in method to convert graph coordinates to screen coordinates
                    const screenCoords = graphRef.current.graph2ScreenCoords(node.x, node.y);
                    // Ensure tooltip stays within viewport bounds
                    const tooltipWidth = 120; // Approximate tooltip width
                    const tooltipHeight = 60; // Approximate tooltip height
                    let x = screenCoords.x;
                    let y = screenCoords.y - 30; // Position above the node
                    // Adjust X position if tooltip would go off-screen
                    if (x + tooltipWidth > window.innerWidth) {
                        x = window.innerWidth - tooltipWidth - 10;
                    }
                    if (x < 10) {
                        x = 10;
                    }
                    // Adjust Y position if tooltip would go off-screen
                    if (y < tooltipHeight + 10) {
                        y = screenCoords.y + 100; // Position below the node instead
                    }
                    setTooltip({
                        x,
                        y,
                        data: {
                            label,
                            type: node.data.type,
                            connections: weight
                        },
                        visible: true
                    });
                } catch (error) {
                    // Fallback: hide tooltip if coordinate conversion fails
                    setTooltip(prev => ({ ...prev, visible: false }));
                }
            }
        } else {
            setTooltip(prev => ({ ...prev, visible: false }));
        }
        handleNodeHover(node);
    }, [handleNodeHover]);

    const handleLinkHover = useCallback((link: any) => {
        // Throttle hover updates to max 60fps
        const now = Date.now();
        if (now - lastRenderTimeRef.current < 16) { // ~60fps
            if (renderThrottleRef.current) {
                clearTimeout(renderThrottleRef.current);
            }
            renderThrottleRef.current = setTimeout(() => {
                handleLinkHover(link);
            }, 16) as any;
            return;
        }
        lastRenderTimeRef.current = now;

        const newHighlightNodes = new Set<string>();
        const newHighlightLinks = new Set<string>();

        if (link) {
            // Add the hovered link
            newHighlightLinks.add(`${link.source}-${link.target}`);

            // Add connected nodes
            newHighlightNodes.add(link.source.id);
            newHighlightNodes.add(link.target.id);
        }

        setHoverNode(null);
        setHighlightNodes(newHighlightNodes);
        setHighlightLinks(newHighlightLinks);
    }, []);

    // Optimized node rendering with proper icon caching
    const renderNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const size = Math.min((node.nodeSize + node.neighbors.length / 5), 20) * (settings.nodeSize.value / 100 + .4);
        node.val = size / 5
        const isHighlighted = highlightNodes.has(node.id) || isSelected(node.id);
        const hasAnyHighlight = highlightNodes.size > 0 || highlightLinks.size > 0;
        const isHovered = hoverNode === node.id || (isCurrent(node.id));

        // Draw highlight ring for highlighted nodes
        if (isHighlighted) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * 1.2, 0, 2 * Math.PI);
            ctx.fillStyle = isHovered ? GRAPH_COLORS.NODE_HIGHLIGHT_HOVER : GRAPH_COLORS.NODE_HIGHLIGHT_DEFAULT;
            ctx.fill();
        }

        // Set node color based on highlight state
        if (hasAnyHighlight) {
            ctx.fillStyle = isHighlighted ? node.nodeColor : `${node.nodeColor}7D`;
        } else {
            ctx.fillStyle = node.nodeColor;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.fill();

        // Early exit for simple rendering
        if (shouldUseSimpleRendering) return;

        // Optimized icon rendering with cached images
        if (showIcons && node.nodeType) {
            const cachedImage = imageCache.get(node.nodeType);
            if (cachedImage && cachedImage.complete) {
                try {
                    ctx.drawImage(cachedImage, node.x - size / 2, node.y - size / 2, size, size);
                } catch (error) {
                    // Silently handle drawing errors
                }
            }
        }

        // Optimized label rendering with layered display
        if (showLabels && globalScale > 3) {
            const label = truncateText(node.nodeLabel || node.label || node.id, 58);
            if (label) {
                // Check if this node's label should be visible in current layer
                const shouldShowLabel = getVisibleLabels.has(node.id);

                // Always show labels for highlighted nodes
                if (!shouldShowLabel && !isHighlighted) {
                    return;
                }
                const fontSize = Math.max(CONSTANTS.MIN_FONT_SIZE, CONSTANTS.NODE_FONT_SIZE * (size / 7));
                ctx.font = `${fontSize}px Sans-Serif`;
                const bgHeight = fontSize + 2;
                const bgY = node.y + size / 2 + 1;
                const color = theme === "light" ? GRAPH_COLORS.TEXT_LIGHT : GRAPH_COLORS.TEXT_DARK;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (isHighlighted) {
                    ctx.fillStyle = color;
                } else {
                    ctx.fillStyle = `${color}4D`; // 30% opacity
                }
                ctx.fillText(label, node.x, bgY + bgHeight / 2);
            }
        }
    }, [shouldUseSimpleRendering, showLabels, showIcons, isCurrent, isSelected, settings.nodeSize.value, theme, highlightNodes, highlightLinks, hoverNode, getVisibleLabels]);

    const renderLink = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
        const { source: start, target: end } = link;
        if (typeof start !== 'object' || typeof end !== 'object') return;
        const linkKey = `${start.id}-${end.id}`;
        const isHighlighted = highlightLinks.has(linkKey);
        const hasAnyHighlight = highlightNodes.size > 0 || highlightLinks.size > 0;
        let strokeStyle: string;
        let lineWidth: number;
        let fillStyle: string;
        if (isHighlighted) {
            strokeStyle = GRAPH_COLORS.LINK_HIGHLIGHTED;
            fillStyle = GRAPH_COLORS.LINK_HIGHLIGHTED;
            lineWidth = CONSTANTS.LINK_WIDTH * (settings.linkWidth.value / 3);
        } else if (hasAnyHighlight) {
            strokeStyle = GRAPH_COLORS.LINK_DIMMED;
            fillStyle = GRAPH_COLORS.LINK_DIMMED;
            lineWidth = CONSTANTS.LINK_WIDTH * (settings.linkWidth.value / 5);
        } else {
            strokeStyle = GRAPH_COLORS.LINK_DEFAULT;
            fillStyle = GRAPH_COLORS.LINK_DEFAULT;
            lineWidth = CONSTANTS.LINK_WIDTH * (settings.linkWidth.value / 5);
        }
        // Draw connection line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        // Draw directional arrow
        const arrowLength = settings.linkDirectionalArrowLength?.value;
        if (arrowLength && arrowLength > 0) {
            const arrowRelPos = settings.linkDirectionalArrowRelPos?.value || 1;
            // Calculate arrow position along the link
            let arrowX = start.x + (end.x - start.x) * arrowRelPos;
            let arrowY = start.y + (end.y - start.y) * arrowRelPos;
            // If arrow is at the target node (arrowRelPos = 1), offset it to be at the node's edge
            if (arrowRelPos === 1) {
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    // Calculate target node size (same as in renderNode function)
                    const targetNodeSize = (end.nodeSize || CONSTANTS.NODE_DEFAULT_SIZE) * (settings.nodeSize.value / 100 + 0.4);
                    // Calculate offset to place arrow at node edge
                    const offset = targetNodeSize / distance;
                    arrowX = end.x - dx * offset;
                    arrowY = end.y - dy * offset;
                }
            }
            // Calculate arrow direction
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const angle = Math.atan2(dy, dx);
            // Draw arrow head
            ctx.save();
            ctx.translate(arrowX, arrowY);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-arrowLength, -arrowLength * 0.5);
            ctx.lineTo(-arrowLength, arrowLength * 0.5);
            ctx.closePath();
            ctx.fillStyle = fillStyle;
            ctx.fill();
            ctx.restore();
        }
        // Early exit for simple rendering or no label
        if (shouldUseSimpleRendering || !link.label) return;
        // Only show labels for highlighted links when there's any highlighting
        if (isHighlighted) {
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
            ctx.fillStyle = theme === "light" ? GRAPH_COLORS.BACKGROUND_LIGHT : GRAPH_COLORS.BACKGROUND_DARK;
            ctx.fillRect(-halfWidth, -halfHeight, tempDimensions[0], tempDimensions[1]);
            // Text - follow same highlighting behavior as links
            ctx.fillStyle = isHighlighted ? GRAPH_COLORS.LINK_LABEL_HIGHLIGHTED : GRAPH_COLORS.LINK_LABEL_DEFAULT;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(link.label, 0, 0);
            ctx.restore();
        }
    }, [shouldUseSimpleRendering, settings.linkWidth.value, settings.linkDirectionalArrowLength?.value, settings.linkDirectionalArrowRelPos?.value, settings.nodeSize.value, theme, highlightLinks, highlightNodes]);

    // Restart simulation when settings change (debounced)
    useEffect(() => {
        let settingsTimeout: number | undefined;
        if (graphRef.current && isGraphReadyRef.current) {
            if (settingsTimeout) clearTimeout(settingsTimeout);
            settingsTimeout = setTimeout(() => {
                graphRef.current?.d3ReheatSimulation();
            }, 100) as any; // Debounce settings changes
        }
        return () => {
            if (settingsTimeout) clearTimeout(settingsTimeout);
        };
    }, [settings]);

    // Clear highlights when graph data changes
    useEffect(() => {
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
        setHoverNode(null);
    }, [nodes, edges]);

    // Cleanup throttle timeouts
    useEffect(() => {
        return () => {
            if (renderThrottleRef.current) {
                clearTimeout(renderThrottleRef.current);
            }
        };
    }, []);

    // Empty state
    if (!nodes.length) {
        return (
            <div
                ref={containerRef}
                className={`flex h-full w-full items-center justify-center ${className}`}
                style={style}
            >
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
                        <p><strong>Labels:</strong> Zoom in to see node labels progressively by connection weight</p>
                    </div>
                    <Button onClick={handleOpenNewAddItemDialog}>
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
                width: '100%',
                height: '100%',
                minHeight: "100%",
                minWidth: "100%",
                position: 'relative',
                ...style
            }}
        >
            {tooltip.visible && (
                <div
                    className="absolute z-20 bg-background border rounded-lg p-2 shadow-lg text-xs pointer-events-none"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translate(-50%, -100%)' // Center horizontally on the node
                    }}
                >
                    <div className="whitespace-pre-line truncate flex flex-col gap-1">
                        <span className='text-md font-semibold'>{tooltip.data?.label}</span>
                        <span className='flex items-center gap-1'><span className='flex items-center gap-1 opacity-60'><Type className='h-3 w-3' /> type:</span> <span className='font-medium'>{tooltip.data?.type}</span></span>
                        <span className='flex items-center gap-1'><span className='flex items-center gap-1 opacity-60'><Share2 className='h-3 w-3' /> connections:</span> <span className='font-medium'>{tooltip.data?.connections}</span></span>
                    </div>
                </div >
            )}
            <ForceGraph2D
                ref={graphRef}
                width={containerSize.width}
                height={containerSize.height}
                graphData={graphData}
                nodeLabel={() => ''} nodeColor={node => shouldUseSimpleRendering ? node.nodeColor : GRAPH_COLORS.TRANSPARENT}
                nodeRelSize={6}
                onNodeRightClick={handleNodeRightClick}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                linkCurvature={link => link.curve}
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
                backgroundColor={backgroundColor}
                onZoom={(zoom) => setCurrentZoom(zoom.k)}
                linkCanvasObject={renderLink}
                enableNodeDrag={!shouldUseSimpleRendering}
                autoPauseRedraw={true}
                onNodeHover={handleNodeHoverWithTooltip}
                onLinkHover={handleLinkHover}
            />
            {allowLasso && isLassoActive && <Lasso nodes={graphData.nodes} graph2ScreenCoords={graph2ScreenCoords} partial={true} width={containerSize.width}
                height={containerSize.height} />}
        </div >
    );
};

export default GraphViewer;