import React, { useMemo, useCallback } from 'react';
import Graph from 'graphology';
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

    useMemo(() => {
        const graph = new Graph();
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
                x: Math.random() * 1000 - 500,  // Random position between -500 and 500
                y: Math.random() * 1000 - 500,
                type: 'circle',
                ...restNode,
                highlighted: false,
                hidden: false,
            });
        });
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

    // Node click event: zoom and highlight (memoized, minimal camera move)
    React.useEffect(() => {
        registerEvents({
            clickNode: ({ node }) => {
                const camera = sigma.getCamera();
                const graph = sigma.getGraph();
                const pos = graph.getNodeAttributes(node);
                // Only move camera if not already at target
                const state = camera.getState();
                if (state.x !== pos.x || state.y !== pos.y || state.ratio !== 0.3) {
                    camera.setState({
                        x: pos.x,
                        y: pos.y,
                        ratio: 0.3, // zoom level
                    });
                }
                // Find the full node object from the store
                const selected = nodes.find(n => n.id === node);
                if (selected) setSelectedNodes([selected]);
            },
            clickStage: () => {
                setSelectedNodes([]);
            }
        });
    }, [registerEvents, sigma, setSelectedNodes, nodes]);

    // Highlight logic: batch and only update if changed
    React.useEffect(() => {
        if (!sigma) return;
        const graph = sigma.getGraph();
        let changed = false;
        if (selectedNodes.length === 0) {
            graph.forEachNode((node, attr) => {
                if (attr.highlighted || attr.dimmed) {
                    graph.setNodeAttribute(node, 'highlighted', false);
                    graph.setNodeAttribute(node, 'dimmed', false);
                    changed = true;
                }
            });
            graph.forEachEdge((edge, attr) => {
                if (attr.highlighted || attr.dimmed) {
                    graph.setEdgeAttribute(edge, 'highlighted', false);
                    graph.setEdgeAttribute(edge, 'dimmed', false);
                    changed = true;
                }
            });
            if (changed) sigma.refresh();
            return;
        }
        const selectedId = selectedNodes[0]?.id;
        const neighbors = new Set(graph.neighbors(selectedId));
        neighbors.add(selectedId);
        graph.forEachNode((node, attr) => {
            const isConnected = neighbors.has(node);
            if (!!attr.highlighted !== isConnected || !!attr.dimmed === isConnected) {
                graph.setNodeAttribute(node, 'highlighted', isConnected);
                graph.setNodeAttribute(node, 'dimmed', !isConnected);
                changed = true;
            }
        });
        graph.forEachEdge((edge, attr, source, target) => {
            const isEdgeConnected = neighbors.has(source) && neighbors.has(target);
            if (!!attr.highlighted !== isEdgeConnected || !!attr.dimmed === isEdgeConnected) {
                graph.setEdgeAttribute(edge, 'highlighted', isEdgeConnected);
                graph.setEdgeAttribute(edge, 'dimmed', !isEdgeConnected);
                changed = true;
            }
        });
        if (changed) sigma.refresh();
    }, [selectedNodes, sigma]);

    return null;
}

const Graph3: React.FC<Graph3Props> = ({ style }) => {
    return (
        <div className="relative h-full grow w-full bg-background">
            <SigmaContainer
                style={{ width: '100%', height: '100%', minHeight: 300, background: 'transparent', ...style }}
                settings={{
                    renderEdgeLabels: false,
                    labelDensity: 0.03,
                    labelGridCellSize: 80,
                    zIndex: false,
                    hideEdgesOnMove: true,
                    hideLabelsOnMove: true,
                    defaultNodeColor: '#0074D9',
                    defaultEdgeColor: '#aaa',
                    allowInvalidContainer: false,
                    nodeReducer: (_, data) => {
                        if (data.dimmed) {
                            return { ...data, color: '#eee', zIndex: 0, label: '' };
                        }
                        if (data.highlighted) {
                            return { ...data, color: '#0074D9', zIndex: 1 };
                        }
                        return data;
                    },
                    edgeReducer: (_, data) => {
                        if (data.dimmed) {
                            return { ...data, color: '#eee', size: 0.5 };
                        }
                        if (data.highlighted) {
                            return { ...data, color: '#0074D9', size: 2 };
                        }
                        return data;
                    },
                }}
            >
                <GraphLoader />
            </SigmaContainer>
        </div>
    );
};

export default Graph3; 