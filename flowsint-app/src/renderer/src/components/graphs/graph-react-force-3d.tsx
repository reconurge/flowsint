import React, { useCallback, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { GraphEdge, GraphNode, useGraphStore } from '@/stores/graph-store';
import { useNodesDisplaySettings } from '@/stores/node-display-settings';
import { useGraphControls } from '@/stores/graph-controls-store';
import type { ItemType } from '@/stores/node-display-settings';
import EmptyState from './empty-state';
//@ts-ignore
import SpriteText from "https://esm.sh/three-spritetext";

interface GraphReactForce3DProps {
    style?: React.CSSProperties;
}


const GraphReactForce3D: React.FC<GraphReactForce3DProps> = () => {
    const nodes = useGraphStore(s => s.nodes) as GraphNode[];
    const edges = useGraphStore(s => s.edges) as GraphEdge[];
    const colors = useNodesDisplaySettings(s => s.colors) as Record<ItemType, string>;
    const toggleNodeSelection = useGraphStore(s => s.toggleNodeSelection);
    const clearSelectedNodes = useGraphStore(s => s.clearSelectedNodes);
    const setActions = useGraphControls(s => s.setActions);
    const getSize = useNodesDisplaySettings(s => s.getSize);
    const graphRef = React.useRef<any>();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const currentNode = useGraphStore(s => s.currentNode);

    const handleNodeClick = useCallback((node: any) => {
        toggleNodeSelection(node, false);
        const distance = 130;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

        graphRef.current.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
            node, // lookAt ({ x, y, z })
            500  // ms transition duration
        );
    }, [toggleNodeSelection]);

    useEffect(() => {
        if (currentNode) {
            handleNodeClick(currentNode);
        }
    }, [currentNode, handleNodeClick]);

    const handleBackgroundClick = useCallback(() => {
        clearSelectedNodes();
    }, [clearSelectedNodes]);

    const handleZoomIn = useCallback((graph: any) => {
        const distance = graph.cameraDistance();
        graph.cameraDistance(distance * 0.75);
    }, []);

    const handleZoomOut = useCallback((graph: any) => {
        const distance = graph.cameraDistance();
        graph.cameraDistance(distance * 1.25);
    }, []);

    const handleFit = useCallback((graph: any) => {
        graph.zoomToFit(400);
    }, []);

    // Set actions in store
    useEffect(() => {
        setActions({
            zoomIn: () => handleZoomIn(graphRef.current),
            zoomOut: () => handleZoomOut(graphRef.current),
            zoomToFit: () => handleFit(graphRef.current),
        });
    }, [setActions, handleZoomIn, handleZoomOut, handleFit]);

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
                <ForceGraph3D
                    ref={graphRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={{ nodes, links: edges }}
                    nodeLabel="label"
                    nodeColor={node => colors[node.data.type]}
                    nodeRelSize={6}
                    nodeVal={node => getSize(node.data.type) / 4}
                    linkDirectionalArrowLength={3.5}
                    linkDirectionalArrowRelPos={1}
                    cooldownTicks={100}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={handleBackgroundClick}
                    linkCurvature={link => link.curve}
                    d3AlphaDecay={0.02}
                    d3VelocityDecay={0.3}
                    // backgroundColor="transparent"
                    linkThreeObjectExtend={true}
                    linkThreeObject={(link: GraphEdge) => {
                        // extend link with text sprite
                        const sprite = new SpriteText(`${link.label}`);
                        sprite.color = 'lightgrey';
                        sprite.textHeight = 1.5;
                        return sprite;
                    }}
                    showNavInfo={false}
                    backgroundColor="#00000000"
                    enableNodeDrag={true}
                    enableNavigationControls={true}
                />
            </div>
        </div>
    );
};

export default GraphReactForce3D; 