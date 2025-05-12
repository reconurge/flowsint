"use client"

import { memo, useCallback, useEffect, useRef } from "react"
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

const ARROW_COLOR = "rgba(255, 255, 255, 0.37)";
const LINE_COLOR = "rgba(255, 255, 255, 0.21)";
const LINE_WIDTH = 1;
const ARROW_HEAD_LENGTH = 5;


const getNodeSize = (type: string) =>
    ["individual", "username", "domain", "organization"].includes(type) ? 80 : 45;

const getNodeRadius = (type: string, isSelected = false) =>
    getNodeSize(type) / 10 + (isSelected ? 0.5 : 0);


const ForceGraph2D = dynamic(() => import("react-force-graph-2d").then((mod) => mod), {
    ssr: false,
})

interface GraphProps {
    isLoading: boolean
    data: { nds: Node[]; rls: EdgeData[] }
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
    panelOpen: boolean
    setPanelOpen: any
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
    panelOpen: state.panelOpen,
    setPanelOpen: state.setPanelOpen
})

const Graph = ({ data, isLoading, width, height }: GraphProps) => {
    const fgRef = useRef<any>(null)
    const { colors, getIcon } = useNodesDisplaySettings()
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
        panelOpen,
        setPanelOpen
    } = useSketchStore(
        stateSelector,
        shallow,
    )

    const setActions = useGraphControls((s) => s.setActions);

    useEffect(() => {
        if (!fgRef.current) return;
        setActions({
            zoomToFit: () => fgRef.current?.zoomToFit(400),
            zoomIn: () => {
                const zoom = fgRef.current?.zoom() ?? 1;
                fgRef.current?.zoom(zoom * 1.2);
            },
            zoomOut: () => {
                const zoom = fgRef.current?.zoom() ?? 1;
                fgRef.current?.zoom(zoom / 1.2);
            },
        });
    }, [!!fgRef.current]);


    useEffect(() => {
        if (isLoading) return
        if (data?.nds) setNodes(data.nds)
        if (data?.rls) setEdges(data.rls)
    }, [data?.nds, data?.rls, isLoading, setNodes, setEdges])

    useEffect(() => {
        if (currentNode && fgRef.current) {
            fgRef.current.centerAt(currentNode.x, currentNode.y, 500)
            fgRef.current.zoom(8, 500)
        }
    }, [currentNode])

    const onNodeClick = useCallback((node: any, event: any) => {
        const multiSelect = event.ctrlKey || event.shiftKey || event.altKey
        toggleNodeSelection(node, multiSelect)
        if (!panelOpen) {
            setPanelOpen(true)
        }
    }, [toggleNodeSelection, panelOpen, setPanelOpen])

    const nodeColor = useCallback(
        (node: any) => {
            const typedNode = node as NodeData;
            return selectedNodes.some(n => n.id === typedNode.id) ? '#FFCC00' : '#888888';
        },
        [selectedNodes]
    )

    const handleBackgroundClick = useCallback(() => {
        clearSelectedNodes()
    }, [clearSelectedNodes])

    if (isLoading) {
        return <Loader label="Loading..." />
    }

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
        )
    }

    return (
        <div className="relative h-full w-full">
            {/* Bouton pour ajouter un nouveau nœud */}
            <div className="top-3 left-3 absolute z-50">
                <NewActions addNodes={addNode}>
                    <Button
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-6 py-2 text-white border-none"
                        size="icon"
                    >
                        <PlusIcon />
                    </Button>
                </NewActions>
            </div>

            {/* Panneau de débogage */}
            <div className="absolute bottom-3 left-3 z-50 bg-card p-2 rounded-lg text-xs opacity-70">
                Selected: {selectedNodes.length}
            </div>

            <ForceGraph2D
                ref={fgRef}
                graphData={{ nodes, links: edges }}
                nodeId="id"
                linkSource="from"
                nodeLabel="label"
                linkTarget="to"
                nodeAutoColorBy="label"
                d3VelocityDecay={0.3}
                d3AlphaDecay={0.05}
                cooldownTicks={50}
                width={width}
                height={height}
                nodeColor={nodeColor}
                linkCanvasObject={(link, ctx) => {
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
                    const targetRadius = getNodeRadius(end.type);
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
                        ctx.font = "3px Sans-Serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(link.caption, 0, -4);
                        ctx.restore();
                    }
                }}
                linkWidth={link => link ? 2 : 1}
                onNodeClick={onNodeClick}
                onBackgroundClick={handleBackgroundClick}
                onNodeDragEnd={(node) => {
                    node.fx = node.x
                    node.fy = node.y
                    node.fz = node.z
                }}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const isSelected = selectedNodes.some(n => n.id === node.id);
                    const isCurrent = currentNode?.id === node.id;
                    const color = colors[node.type as keyof typeof colors]
                    const nodeSize = ["individual", "username", "domain", "organization"].includes(node?.type) ? 80 : 45
                    const radius = nodeSize / 10 + (isSelected ? 0.5 : 0)
                    const fontSize = globalScale * 0.2462
                    ctx.font = `${fontSize}px Sans-Serif`
                    ctx.fillStyle = color
                    ctx.beginPath()
                    ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false)
                    ctx.fill()
                    ctx.beginPath()
                    ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false)
                    ctx.strokeStyle = color || "black"
                    ctx.lineWidth = isSelected ? 0.5 : 0.2
                    ctx.stroke()
                    const size = ["individual", "username", "domain", "organization"].includes(node?.type) ? 8 : 4
                    ctx.drawImage(getIcon(node.type), node.x - size / 2, node.y - size / 2, size, size);
                    if (isSelected) {
                        ctx.beginPath()
                        ctx.arc(node.x!, node.y!, radius + 0.8, 0, 2 * Math.PI, false)
                        ctx.strokeStyle = '#FFCC00'
                        ctx.lineWidth = 0.3
                        ctx.stroke()
                        if (node.label) {
                            ctx.fillStyle = '#FFFFFF'
                            ctx.font = `bold ${fontSize * 1.2}px Sans-Serif`
                            ctx.textAlign = 'center'
                            ctx.fillText(node.label, node.x!, node.y! + radius + 4.5)
                        }
                    }
                    if (isCurrent) {
                        ctx.beginPath()
                        ctx.arc(node.x!, node.y!, radius + 1.5, 0, 2 * Math.PI, false)
                        ctx.strokeStyle = 'white'
                        ctx.lineWidth = 0.2
                        ctx.setLineDash([0.5, 0.5])
                        ctx.stroke()
                        ctx.setLineDash([])
                    }
                }}
            />
        </div>
    )
}

export default memo(Graph)