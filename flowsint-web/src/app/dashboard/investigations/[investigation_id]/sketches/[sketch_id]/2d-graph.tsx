"use client"

import { memo, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import Loader from "@/components/loader"
import NewActions from "@/components/sketches/new-actions"
import { PlusIcon } from "lucide-react"
import { useSketchStore } from "@/store/sketch-store"
import { shallow } from "zustand/shallow"
import { useNodesDisplaySettings } from "@/store/node-display-settings"
import type { NodeData, EdgeData } from "@/types"
import { useGraphControls } from "@/store/graph-controls-store"

// @ts-ignore
import { forceCollide } from 'd3'

// const ARROW_COLOR = "rgba(136, 136, 136, 0.21)";
// const LINE_COLOR = "rgba(136, 136, 136, 0.21)";
// const LINE_WIDTH = 0.4;
// const ARROW_HEAD_LENGTH = 1;

const ForceGraph2D = dynamic(() => import("react-force-graph-2d").then((mod) => mod), {
    ssr: false,
})

interface GraphProps {
    isLoading: boolean
    data: { nds: NodeData[]; rls: EdgeData[] }
    width?: number
    height?: number
}

const stateSelector = (state: {
    setCurrentNode: any
    toggleNodeSelection: any
    clearSelectedNodes: any
    nodes: NodeData[]
    edges: EdgeData[]
    setNodes: any
    setEdges: any
    addNode: any
    currentNode: NodeData | null,
    selectedNodes: NodeData[],
    setSelectedNodes: any
    isCurrent: any,
    isSelected: any
}) => ({
    setCurrentNode: state.setCurrentNode,
    toggleNodeSelection: state.toggleNodeSelection,
    clearSelectedNodes: state.clearSelectedNodes,
    nodes: state.nodes,
    edges: state.edges,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    addNode: state.addNode,
    currentNode: state.currentNode,
    selectedNodes: state.selectedNodes,
    setSelectedNodes: state.setSelectedNodes,
    isSelected: state.isSelected,
    isCurrent: state.isCurrent
})

const Graph = ({ data, isLoading, width, height }: GraphProps) => {
    const colors = useNodesDisplaySettings(c => c.colors)
    const setActions = useGraphControls((s) => s.setActions)
    const {
        currentNode,
        selectedNodes,
        toggleNodeSelection,
        clearSelectedNodes,
        setNodes,
        setEdges,
        nodes,
        edges,
        isSelected,
    } = useSketchStore(
        stateSelector,
        shallow,
    )

    // // Link canvas object rendering function
    // const linkCanvaObject = useCallback((link: any, ctx: any) => {
    //     const start = link.target as any;
    //     const end = link.source as any;
    //     if (
    //         !start || !end ||
    //         typeof start.x !== "number" || typeof start.y !== "number" ||
    //         typeof end.x !== "number" || typeof end.y !== "number"
    //     ) return;
    //     const dx = end.x - start.x;
    //     const dy = end.y - start.y;
    //     const angle = Math.atan2(dy, dx);
    //     const targetRadius = getSize(end.type) / 10;
    //     const tx = end.x - Math.cos(angle) * targetRadius;
    //     const ty = end.y - Math.sin(angle) * targetRadius;
    //     ctx.strokeStyle = LINE_COLOR;
    //     ctx.lineWidth = LINE_WIDTH;
    //     ctx.beginPath();
    //     ctx.moveTo(start.x, start.y);
    //     ctx.lineTo(tx, ty);
    //     ctx.stroke();
    //     ctx.fillStyle = ARROW_COLOR;
    //     ctx.beginPath();
    //     ctx.moveTo(tx, ty);
    //     ctx.lineTo(
    //         tx - ARROW_HEAD_LENGTH * Math.cos(angle - Math.PI / 10),
    //         ty - ARROW_HEAD_LENGTH * Math.sin(angle - Math.PI / 10)
    //     );
    //     ctx.lineTo(
    //         tx - ARROW_HEAD_LENGTH * Math.cos(angle + Math.PI / 10),
    //         ty - ARROW_HEAD_LENGTH * Math.sin(angle + Math.PI / 10)
    //     );
    //     ctx.closePath();
    //     ctx.fill();
    //     if (link.caption) {
    //         const midX = (start.x + tx) / 2;
    //         const midY = (start.y + ty) / 2;
    //         ctx.save();
    //         ctx.translate(midX, midY);
    //         ctx.rotate(angle);
    //         ctx.fillStyle = "#333";
    //         ctx.font = "1px Sans-Serif";
    //         ctx.textAlign = "center";
    //         ctx.textBaseline = "middle";
    //         ctx.fillText(link.caption, 0, -1);
    //         ctx.restore();
    //     }
    // }, [getSize])

    // Setup graph instance when it's available - using callback approach
    const handleGraphRef = useCallback((graphInstance: any) => {
        if (!graphInstance) return;

        // Configure the D3 forces
        graphInstance.d3Force('charge').distanceMax(25);
        graphInstance.d3Force('charge').strength(-15);
        graphInstance.d3Force('link').distance(30);
        graphInstance.d3Force('collision', forceCollide((node: any) => 2.5 * node.radius));
        graphInstance.d3Force('collide', forceCollide(1));

        // Set up the actions API
        setActions({
            zoomToFit: () => graphInstance.zoomToFit(400),
            zoomIn: () => {
                const zoom = graphInstance.zoom() ?? 1;
                graphInstance.zoom(zoom * 1.2);
            },
            zoomOut: () => {
                const zoom = graphInstance.zoom() ?? 1;
                graphInstance.zoom(zoom / 1.2);
            },
        });
    }, [setActions]);

    // Center on current node when it changes
    const handleGraphInstance = useCallback((graphInstance: any) => {
        if (!graphInstance || !currentNode) return;

        graphInstance.centerAt(currentNode.x, currentNode.y, 500);
        graphInstance.zoom(8, 500);
    }, [currentNode]);

    // Update nodes and edges when data changes
    useEffect(() => {
        if (isLoading) return;
        if (data?.nds) setNodes(data.nds);
        if (data?.rls) setEdges(data.rls);
        console.log(data.rls)
    }, [data?.nds, data?.rls, isLoading, setNodes, setEdges]);

    // Node click handler
    const onNodeClick = useCallback((node: NodeData, event: React.MouseEvent) => {
        const multiSelect = event.ctrlKey || event.shiftKey || event.altKey;
        toggleNodeSelection(node, multiSelect);
    }, [toggleNodeSelection]);

    // Calculate node color based on selection state
    const nodeColor = useCallback(
        (node: NodeData) => {
            return selectedNodes.some(n => n.id === node.id) ? '#FFCC00' : '#888888';
        },
        [selectedNodes]
    );

    // Handle background click to clear selection
    const handleBackgroundClick = useCallback(() => {
        clearSelectedNodes();
    }, [clearSelectedNodes]);

    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.label || '';
        const fontSize = 12 / globalScale;
        const isNodeSelected = isSelected(node.id);
        const radius = isNodeSelected ? 4 : 4;
        const color = colors[node.type as keyof typeof colors] || "#9FAAB8";
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = color;
        ctx.fill();

        // Aucune ombre pour meilleures perfs
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Pas de texte si trop zoomé
        if (globalScale > 0.3 && isNodeSelected) {
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#fff';
            ctx.fillText(label, node.x, node.y + radius + 2);
        }
    }, [isSelected, nodeColor]);

    // // ✏️ Dessin des liens (optionnel si peu nombreux)
    // const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    //     const start = link.source;
    //     const end = link.target;

    //     if (!start || !end || !('x' in start) || !('x' in end)) return;

    //     const x1 = start.x;
    //     const y1 = start.y;
    //     const x2 = end.x;
    //     const y2 = end.y;

    //     ctx.beginPath();
    //     ctx.moveTo(x1, y1);
    //     ctx.lineTo(x2, y2);
    //     ctx.strokeStyle = '#999';
    //     ctx.lineWidth = 1;
    //     ctx.stroke();
    // }, []);


    // Render loading state
    if (isLoading) {
        return <Loader label="Loading..." />;
    }

    // Render empty state
    if (!nodes.length) {
        return (
            <div className="flex relative gap-3 h-full flex-col w-full items-center justify-center">
                Your nodes will be displayed here.
                <NewActions>
                    <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-6 py-2 text-white border-none">
                        Add your first item <PlusIcon />
                    </Button>
                </NewActions>
            </div>
        );
    }

    // Render graph
    return (
        <div className="relative h-full w-full">
            <div className="absolute bottom-3 left-3 z-50 bg-card p-2 rounded-lg text-xs opacity-70">
                Selected: {selectedNodes.length}
            </div>
            <ForceGraph2D
                // @ts-ignore
                ref={(instance: any) => {
                    handleGraphRef(instance);
                    if (currentNode) handleGraphInstance(instance);
                }}
                cooldownTicks={100}
                graphData={{ nodes, links: edges }}
                nodeId="id"
                linkSource="from"
                nodeLabel="label"
                linkTarget="to"
                nodeAutoColorBy="label"
                width={width}
                height={height}
                // @ts-ignore
                nodeColor={nodeColor}
                // linkCanvasObject={linkCanvaObject}
                linkWidth={link => link ? 2 : 1}
                // @ts-ignore
                onNodeClick={onNodeClick}
                onBackgroundClick={handleBackgroundClick}
                onNodeDragEnd={(node) => {
                    node.fx = node.x;
                    node.fy = node.y;
                    node.fz = node.z;
                }}
                // @ts-ignore
                nodeCanvasObject={nodeCanvasObject}
            />
        </div>
    );
};

export default memo(Graph);