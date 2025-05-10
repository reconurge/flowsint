"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import Loader from "@/components/loader"
import NewActions from "@/components/sketches/new-actions"
import { PlusIcon } from "lucide-react"
import { useSketchStore } from "@/store/sketch-store"
import { shallow } from "zustand/shallow"
import { useColorSettings } from "@/store/color-settings"
import type { NodeData, EdgeData } from "@/types"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d").then((mod) => mod), {
    ssr: false,
})

interface GraphProps {
    isLoading: boolean
    minimapRef: any
    data: { nds: Node[]; rls: EdgeData[] }
    // Nouvelles props pour les dimensions
    width?: number
    height?: number
}

const stateSelector = (state: {
    setCurrentNode: any
    nodes: NodeData[]
    edges: EdgeData[]
    setNodes: any
    setEdges: any
    addNode: any
    currentNode: NodeData | null
}) => ({
    setCurrentNode: state.setCurrentNode,
    nodes: state.nodes,
    edges: state.edges,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    addNode: state.addNode,
    currentNode: state.currentNode,
})

const Graph = ({ data, isLoading, minimapRef, width, height }: GraphProps) => {
    const fgRef = useRef<any>(null)
    const [ready, setReady] = useState(false)

    const { colors } = useColorSettings()
    const { currentNode, setCurrentNode, addNode, setNodes, setEdges, nodes, edges } = useSketchStore(
        stateSelector,
        shallow,
    )

    useEffect(() => {
        if (minimapRef?.current) {
            setReady(true)
        }
    }, [minimapRef])

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

    const onNodeClick = useCallback(
        (node: any) => {
            setCurrentNode(node)
        },
        [setCurrentNode],
    )

    if (isLoading || !ready) {
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

            <ForceGraph2D
                ref={fgRef}
                graphData={{ nodes, links: edges }}
                nodeId="id"
                linkSource="from"
                nodeLabel={"label"}
                linkTarget="to"
                nodeAutoColorBy="label"
                d3VelocityDecay={0.3}
                d3AlphaDecay={0.05}
                cooldownTicks={50}
                width={width}
                height={height}
                onNodeClick={onNodeClick}
                onBackgroundClick={() => setCurrentNode(null)}
                linkColor={"red"}
                onNodeDragEnd={(node) => {
                    node.fx = node.x
                    node.fy = node.y
                    node.fz = node.z
                }}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const radius = node.size / 10
                    const background = getComputedStyle(document.documentElement).getPropertyValue("--card")?.trim()
                    const fontSize = globalScale * 0.2462
                    ctx.font = `${fontSize}px Sans-Serif`
                    ctx.fillStyle = background
                    ctx.beginPath()
                    ctx.arc(node.x!, node.y!, node.size / 10, 0, 2 * Math.PI, false)
                    ctx.fill()
                    // Contour
                    ctx.beginPath()
                    ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false)
                    ctx.strokeStyle = colors[node.type as keyof typeof colors] || "black"
                    ctx.lineWidth = 0.4
                    ctx.stroke()
                }}
            />
        </div>
    )
}

export default memo(Graph)
