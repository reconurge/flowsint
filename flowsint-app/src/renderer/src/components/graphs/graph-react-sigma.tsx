import React, { useEffect, useRef, useMemo } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { GraphEdge, GraphNode, useGraphStore } from '@/stores/graph-store';
import { useNodesDisplaySettings } from '@/stores/node-display-settings';
import { useGraphControls } from '@/stores/graph-controls-store';
import type { ItemType } from '@/stores/node-display-settings';

const GraphReactSigma: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sigmaRef = useRef<Sigma | null>(null);
    const nodes = useGraphStore(s => s.nodes) as GraphNode[];
    const edges = useGraphStore(s => s.edges) as GraphEdge[];
    const getSize = useNodesDisplaySettings(s => s.getSize);
    const colors = useNodesDisplaySettings(s => s.colors) as Record<ItemType, string>;
    const toggleNodeSelection = useGraphStore(s => s.toggleNodeSelection);
    const clearSelectedNodes = useGraphStore(s => s.clearSelectedNodes);
    const setActions = useGraphControls(s => s.setActions);

    console.log(edges)
    // Memoize processed data for performance
    const processedNodes = useMemo(() => {
        return nodes.map(node => ({
            id: node.id,
            label: node.data?.label || node.id,
            type: node.data?.type as ItemType,
            size: getSize(node.data?.type as ItemType),
            color: colors[node.data?.type as ItemType] || '#0074D9',
            originalNode: node
        }));
    }, [nodes, getSize, colors]);

    // Initialize Sigma
    useEffect(() => {
        if (!containerRef.current) return;

        const graph = new Graph();
        const sigma = new Sigma(graph, containerRef.current, {
            defaultNodeType: 'circle',
            defaultEdgeType: 'line',
            renderEdgeLabels: false,
        });

        sigmaRef.current = sigma;

        // Set up zoom actions
        setActions({
            zoomIn: () => sigma.getCamera().animatedZoom({ duration: 300 }),
            zoomOut: () => sigma.getCamera().animatedUnzoom({ duration: 300 }),
            zoomToFit: () => sigma.getCamera().animatedReset({ duration: 300 }),
        });

        // Set up event handlers
        sigma.on('clickNode', (event) => {
            const originalNode = processedNodes.find(n => n.id === event.node)?.originalNode;
            if (originalNode) {
                toggleNodeSelection(originalNode, false);
            }
        });

        sigma.on('clickStage', () => {
            clearSelectedNodes();
        });

        return () => {
            sigma.kill();
        };
    }, [setActions, toggleNodeSelection, clearSelectedNodes, processedNodes]);

    // Update graph data
    useEffect(() => {
        if (!sigmaRef.current) return;
        if (processedNodes.length === 0) return;
        const graph = sigmaRef.current.getGraph();
        graph.clear();
        // Add nodes with simple random positioning
        processedNodes.forEach(node => {
            const x = (Math.random() - 0.5) * 400;
            const y = (Math.random() - 0.5) * 400;

            graph.addNode(node.id, {
                label: node.label,
                size: node.size,
                color: node.color,
                x: x,
                y: y,
            });
        });

        edges.forEach(edge => {
            const sourceExists = graph.hasNode(edge.source);
            const targetExists = graph.hasNode(edge.target);
            if (sourceExists && targetExists) {
                graph.addEdge(edge.source, edge.target, { label: edge.label });
            }
        });
        // Force a refresh and fit to view
        setTimeout(() => {
            sigmaRef.current?.getCamera().animatedReset({ duration: 300 });
            sigmaRef.current?.refresh();
        }, 100);

    }, [processedNodes, edges]);

    // Handle container resize
    useEffect(() => {
        if (!containerRef.current || !sigmaRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            sigmaRef.current?.refresh();
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    if (!nodes.length) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                No nodes to display
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '400px'
            }}
        />
    );
};

export default GraphReactSigma;