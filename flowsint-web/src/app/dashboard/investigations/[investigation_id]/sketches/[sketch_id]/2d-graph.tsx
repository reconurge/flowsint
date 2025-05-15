"use client"

import { memo, useCallback, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import Loader from "@/components/loader"
import NewActions from "@/components/sketches/new-actions"
import { PlusIcon } from "lucide-react"
import { useSketchStore } from "@/store/sketch-store"
import { shallow } from "zustand/shallow"
import { ItemType, useNodesDisplaySettings } from "@/store/node-display-settings"
import type { NodeData, EdgeData } from "@/types"
import { useGraphControls } from "@/store/graph-controls-store"
// @ts-ignore
import { forceCollide } from 'd3'

const ARROW_COLOR = "rgba(136, 136, 136, 0.21)";
const LINE_COLOR = "rgba(136, 136, 136, 0.21)";
const LINE_WIDTH = 0.4;
const ARROW_HEAD_LENGTH = 1;

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
    const getIcon = useNodesDisplaySettings(c => c.getIcon)
    const getSize = useNodesDisplaySettings(c => c.getSize)
    const setActions = useGraphControls((s) => s.setActions)

    const {
        currentNode,
        selectedNodes,
        toggleNodeSelection,
        clearSelectedNodes,
        addNode,
        setNodes,
        setEdges,
        nodes,
        edges,
        isSelected,
        isCurrent,
    } = useSketchStore(
        stateSelector,
        shallow,
    )

    // Link canvas object rendering function
    const linkCanvaObject = useCallback((link: any, ctx: any) => {
        const start = link.target as any;
        const end = link.source as any;
        if (
            !start || !end ||
            typeof start.x !== "number" || typeof start.y !== "number" ||
            typeof end.x !== "number" || typeof end.y !== "number"
        ) return;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);
        const targetRadius = getSize(end.type) / 10;
        const tx = end.x - Math.cos(angle) * targetRadius;
        const ty = end.y - Math.sin(angle) * targetRadius;
        ctx.strokeStyle = LINE_COLOR;
        ctx.lineWidth = LINE_WIDTH;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = ARROW_COLOR;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(
            tx - ARROW_HEAD_LENGTH * Math.cos(angle - Math.PI / 10),
            ty - ARROW_HEAD_LENGTH * Math.sin(angle - Math.PI / 10)
        );
        ctx.lineTo(
            tx - ARROW_HEAD_LENGTH * Math.cos(angle + Math.PI / 10),
            ty - ARROW_HEAD_LENGTH * Math.sin(angle + Math.PI / 10)
        );
        ctx.closePath();
        ctx.fill();
        if (link.caption) {
            const midX = (start.x + tx) / 2;
            const midY = (start.y + ty) / 2;
            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(angle);
            ctx.fillStyle = "#333";
            ctx.font = "1px Sans-Serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(link.caption, 0, -1);
            ctx.restore();
        }
    }, [getSize])

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

    // Node canvas object rendering function
    const nodeCanvasObject = useCallback((node: NodeData, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const isNodeSelected = isSelected(node.id);
        const isNodeCurrent = isCurrent(node.id);
        const color = colors[node.type as keyof typeof colors] || "#9FAAB8";
        const nodeSize = getSize(node?.type as ItemType) || 25;
        const radius = nodeSize / 10 + (isNodeSelected ? 0.5 : 0);
        const fontSize = globalScale * 0.2462;

        // Draw node circle
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
        ctx.fill();

        // Draw node outline
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
        ctx.strokeStyle = color || "black";
        ctx.lineWidth = isNodeSelected ? 0.5 : 0.2;
        ctx.stroke();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
        ctx.fill();
        // Draw node icon
        const size = nodeSize / 10;
        ctx.drawImage(getIcon(node.type as ItemType), node.x! - size / 2, node.y! - size / 2, size, size);

        // Draw selection highlight
        if (isNodeSelected) {
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, radius + 0.8, 0, 2 * Math.PI, false);
            ctx.strokeStyle = '#FFCC00';
            ctx.lineWidth = 0.3;
            ctx.stroke();

            // Draw node label when selected
            if (node.label) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.fillText(node.label, node.x!, node.y! + radius + 4.5);
            }
        }

        // Draw current node indicator
        if (isNodeCurrent) {
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, radius + 1.5, 0, 2 * Math.PI, false);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 0.2;
            ctx.setLineDash([0.5, 0.5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.save(); // Sauvegarde l'état du contexte
    }, [colors, getIcon, getSize, isSelected, isCurrent]);

    // Render loading state
    if (isLoading) {
        return <Loader label="Loading..." />;
    }

    // Render empty state
    if (!nodes.length) {
        return (
            <div className="flex relative gap-3 h-full flex-col w-full items-center justify-center">
                Your nodes will be displayed here.
                <NewActions addNodes={addNode}>
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
                linkCanvasObject={linkCanvaObject}
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