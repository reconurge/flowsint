import React, { useMemo, useCallback, useState } from 'react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { SigmaContainer, useLoadGraph, useSigma, useRegisterEvents } from '@react-sigma/core';
import { useSketchStore } from '@/stores/sketch-store';
import { useNodesDisplaySettings } from '@/stores/node-display-settings';
import { useGraphControls } from '@/stores/graph-controls-store';
import "@react-sigma/core/lib/style.css";
import type { NodeData, EdgeData } from '@/types';
import type { ItemType } from '@/stores/node-display-settings';

interface Graph3Props {
    style?: React.CSSProperties;
}

function GraphLoader() {
    const nodes = useSketchStore(s => s.nodes) as NodeData[];
    const rawEdges = useSketchStore(s => s.edges) as EdgeData[];
    const getIcon = useNodesDisplaySettings(s => s.getIcon);
    const getSize = useNodesDisplaySettings(s => s.getSize);
    const colors = useNodesDisplaySettings(s => s.colors) as Record<ItemType, string>;
    const loadGraph = useLoadGraph();
    const sigma = useSigma();
    const setActions = useGraphControls(s => s.setActions);
    const setSelectedNodes = useSketchStore(s => s.setSelectedNodes);
    const selectedNodes = useSketchStore(s => s.selectedNodes) as NodeData[];
    const registerEvents = useRegisterEvents();
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    useMemo(() => {
        const graph = new Graph();
        
        // Add nodes
        nodes.forEach((node) => {
            const type = node.type || node.data?.type;
            const color = colors[type] || '#0074D9';
            const icon = getIcon(type);
            const size = getSize(type) * 0.5;
            let nodeLabel = node.label;
            if (!nodeLabel && 'caption' in node) nodeLabel = (node as any).caption;
            if (!nodeLabel) nodeLabel = node.id;
            const { label: _, type: __, ...restNode } = node;
            (graph as any).addNode(node.id, {
                label: `${icon ? icon + ' ' : ''}${nodeLabel}`,
                color,
                size,
                x: Math.random() * 1000 - 500,
                y: Math.random() * 1000 - 500,
                type: 'circle',
                ...restNode,
                highlighted: false,
                hidden: false,
            });
        });

        // Add edges
        rawEdges.forEach(edge => {
            const { label: edgeLabel, type: edgeType, ...restEdge } = edge;
            (graph as any).addEdge(edge.from, edge.to, {
                label: edgeLabel,
                type: 'arrow',
                ...restEdge,
                highlighted: false,
                hidden: false,
            });
        });

        // Apply force-directed layout
        const settings = forceAtlas2.inferSettings(graph);
        forceAtlas2.assign(graph, { ...settings, iterations: 50 });
        
        loadGraph(graph);
    }, [nodes, rawEdges, getIcon, getSize, colors, loadGraph]);

    // Camera controls (memoized)
    const handleZoomIn = useCallback(() => {
        sigma.getCamera().animatedZoom({ duration: 200, factor: 1.5 });
    }, [sigma]);
    const handleZoomOut = useCallback(() => {
        sigma.getCamera().animatedZoom({ duration: 200, factor: 0.75 });
    }, [sigma]);
    const handleFit = useCallback(() => {
        sigma.getCamera().animatedReset({ duration: 200 });
    }, [sigma]);

    // Set actions in store (only once)
    React.useEffect(() => {
        setActions({
            zoomIn: handleZoomIn,
            zoomOut: handleZoomOut,
            zoomToFit: handleFit,
        });
    }, [setActions, handleZoomIn, handleZoomOut, handleFit]);

    // Node interaction events
    React.useEffect(() => {
        registerEvents({
            clickNode: ({ node }) => {
                const camera = sigma.getCamera();
                const graph = sigma.getGraph();
                const pos = graph.getNodeAttributes(node);
                
                // Zoom to node with a smoother animation
                camera.animate({
                    x: pos.x,
                    y: pos.y,
                    ratio: 0.5
                }, {
                    duration: 300,
                    easing: 'easeInOutQuad'
                });

                // Set selected node
                const selected = nodes.find(n => n.id === node);
                if (selected) setSelectedNodes([selected]);
            },
            enterNode: ({ node }) => {
                setHoveredNode(node);
                const graph = sigma.getGraph();
                
                // Dim other nodes and edges
                graph.forEachNode((n, attr) => {
                    if (n === node) {
                        graph.setNodeAttribute(n, 'highlighted', true);
                        graph.setNodeAttribute(n, 'dimmed', false);
                    } else {
                        graph.setNodeAttribute(n, 'highlighted', false);
                        graph.setNodeAttribute(n, 'dimmed', true);
                    }
                });

                graph.forEachEdge((edge, attr, source, target) => {
                    if (source === node || target === node) {
                        graph.setEdgeAttribute(edge, 'highlighted', true);
                        graph.setEdgeAttribute(edge, 'dimmed', false);
                    } else {
                        graph.setEdgeAttribute(edge, 'highlighted', false);
                        graph.setEdgeAttribute(edge, 'dimmed', true);
                    }
                });

                sigma.refresh();
            },
            leaveNode: () => {
                setHoveredNode(null);
                const graph = sigma.getGraph();
                
                // Reset all nodes and edges to normal state
                graph.forEachNode((node, attr) => {
                    graph.setNodeAttribute(node, 'highlighted', false);
                    graph.setNodeAttribute(node, 'dimmed', false);
                });

                graph.forEachEdge((edge, attr) => {
                    graph.setEdgeAttribute(edge, 'highlighted', false);
                    graph.setEdgeAttribute(edge, 'dimmed', false);
                });

                sigma.refresh();
            },
            clickStage: () => {
                setSelectedNodes([]);
            }
        });
    }, [registerEvents, sigma, setSelectedNodes, nodes]);

    return null;
}

const Graph3: React.FC<Graph3Props> = ({ style }) => {
    return (
        <div className="relative h-full grow w-full bg-background">
            <SigmaContainer
                style={{ width: '100%', height: '100%', minHeight: 300, background: 'transparent', ...style }}
                settings={{
                    renderEdgeLabels: true,
                    labelDensity: 0.07,
                    labelGridCellSize: 60,
                    zIndex: true,
                    hideEdgesOnMove: false,
                    hideLabelsOnMove: false,
                    defaultNodeColor: '#0074D9',
                    defaultEdgeColor: '#aaa',
                    allowInvalidContainer: false,
                    nodeReducer: (_, data) => {
                        if (data.dimmed) {
                            return { 
                                ...data, 
                                color: data.color,
                                opacity: 0.3,
                                zIndex: 0,
                                label: ''
                            };
                        }
                        if (data.highlighted) {
                            return { 
                                ...data, 
                                color: data.color,
                                opacity: 1,
                                zIndex: 2,
                                size: data.size * 1.1
                            };
                        }
                        return { ...data, opacity: 1 };
                    },
                    edgeReducer: (_, data) => {
                        if (data.dimmed) {
                            return { 
                                ...data, 
                                color: data.color,
                                opacity: 0.2,
                                size: 0.5,
                                zIndex: 0 
                            };
                        }
                        if (data.highlighted) {
                            return { 
                                ...data, 
                                color: data.color,
                                opacity: 1,
                                size: 1.5,
                                zIndex: 1 
                            };
                        }
                        return { ...data, opacity: 0.6 };
                    },
                }}
            >
                <GraphLoader />
            </SigmaContainer>
        </div>
    );
};

export default Graph3; 