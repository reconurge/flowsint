// components/Graph.tsx

"use client"

import { useCallback, useRef, useMemo, useEffect } from "react"
import dynamic from "next/dynamic"
import SpriteText from "three-spritetext"
import { ForceGraphMethods } from "react-force-graph-3d"
import { EdgeData, NodeData } from "@/types"
import { useSketchStore } from "@/store/sketch-store"
import { shallow } from "zustand/shallow"

const ForceGraph3D = dynamic(
    () => import("react-force-graph-3d").then((mod) => mod.default),
    { ssr: false }
)

interface Node {
    id: string
    label: string
    type?: string
    [key: string]: any
}

interface Edge {
    from: string
    to: string
}

interface GraphProps {
    isLoading: boolean
    data: { nds: NodeData[]; rls: EdgeData[] }
    width?: number
    height?: number
}


const stateSelector = (state: {
    nodes: NodeData[]
    edges: EdgeData[]
    setNodes: any
    setEdges: any

}) => ({
    nodes: state.nodes,
    edges: state.edges,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
})

const Graph: React.FC<GraphProps> = ({ data, isLoading, width, height }) => {
    const fgRef = useRef<any>(null)

    const {
        setNodes,
        setEdges,
        nodes,
        edges
    } = useSketchStore(
        stateSelector,
        shallow,
    )

    const nodeColor = useCallback((node: Node) => {
        switch (node.type) {
            case "organization":
                return "#4ade80" // vert
            case "individual":
                return "#60a5fa" // bleu
            case "email":
                return "#facc15" // jaune
            case "phone":
                return "#f472b6" // rose
            case "social":
                return "#38bdf8" // cyan
            default:
                return "#cbd5e1" // gris clair
        }
    }, [])

    const nodeThreeObject = useCallback((node: Node) => {
        const sprite = new SpriteText(node.label || node.id)
        sprite.color = nodeColor(node)
        sprite.textHeight = 8
        return sprite
    }, [nodeColor])

    useEffect(() => {
        if (isLoading) return
        if (data?.nds) setNodes(data.nds)
        if (data?.rls) setEdges(data.rls)
    }, [data?.nds, data?.rls, isLoading, setNodes, setEdges])
    return (
        <div className="relative h-full w-full bg-card">
            <ForceGraph3D
                ref={fgRef}
                graphData={{ nodes, links: edges }}
                nodeId="id"
                nodeLabel="label"
                nodeAutoColorBy="type"
                nodeThreeObject={nodeThreeObject}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                width={width}
                height={height}
                onNodeDragEnd={(node: any) => {
                    node.fx = node.x
                    node.fy = node.y
                    node.fz = node.z
                }}
            />
        </div>
    )
}

export default Graph
