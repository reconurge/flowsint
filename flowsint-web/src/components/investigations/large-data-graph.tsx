"use client"
import React, { useEffect, useState, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { AlignCenterVertical, PencilRulerIcon, RotateCwIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useFlowStore } from "../../store/flow-store"
import Loader from "../loader"
import { useQueryState } from "nuqs"

// Import ForceGraph2D with types
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

// Constants
const NODE_R = 8

// Types
interface NodeData {
    id: string
    color?: string
    x?: number
    y?: number
    [key: string]: any
}

interface EdgeData {
    source: string
    target: string
    [key: string]: any
}

interface GraphData {
    nodes: NodeData[]
    links: EdgeData[]
}

interface LayoutFlowProps {
    refetch: () => void
    isLoading: boolean
    theme: string
}

interface ForceGraphNode extends NodeData {
    id: string
    x: number
    y: number
    color: string
}

interface LargeInvestigationGraphProps {
    graphQuery: {
        refetch: () => void
        isLoading: boolean
        data?: {
            nodes: NodeData[]
            edges: EdgeData[]
        }
    }
}

function LayoutFlow({ refetch, theme }: LayoutFlowProps) {
    const [view, setView] = useQueryState("view", { defaultValue: "flow-graph" })
    const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set())
    const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set())
    const [hoverNode, setHoverNode] = useState<ForceGraphNode | null>(null)
    const graphRef = React.useRef<any>(null)


    const { nodes, edges, reloading } = useFlowStore()

    // Convert data for ForceGraph
    const graphData: GraphData = useMemo(() => {
        return {
            nodes: nodes.map((node) => ({
                id: node.id,
                ...node.data,
                color: typeof node.data.color === "string" ? node.data.color : (theme === "dark" ? "#fff" : "#000"),
            })),
            links: edges.map((edge) => ({
                source: edge.source,
                target: edge.target,
                ...edge.data,
            })),
        }
    }, [nodes, edges, theme])

    const handleNodeHover = (node: { [key: string]: any; id?: string | number; x?: number; y?: number; color?: string } | null) => {
        setHoverNode(node && typeof node.id === 'string' ? node as ForceGraphNode : null)
        setHighlightNodes(new Set(node && typeof node.id === 'string' ? [node.id] : []))
        setHighlightLinks(
            new Set(
                node
                    ? edges
                        .filter((edge) => edge.source === node.id || edge.target === node.id)
                        .map((edge) => `${edge.source}-${edge.target}`)
                    : [],
            ),
        )
    }

    const handleNodeClick = useCallback((node: { [key: string]: any; id?: string | number; x?: number; y?: number; color?: string }, event: MouseEvent) => {
        if (node && graphRef.current) {
            if (node.x !== undefined && node.y !== undefined) {
                graphRef.current.centerAt(node.x, node.y, 1000)
                graphRef.current.zoom(2, 1000)
            }
        }
    }, [])

    const Node = useCallback(
        (
            node: { [key: string]: any; id?: string | number; x?: number; y?: number; color?: string },
            ctx: CanvasRenderingContext2D,
        ) => {
            if (node.x !== undefined && node.y !== undefined) {
                const label = node.data.label
                const fontSize = 14 // Increased font size
                ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif` // System font
                const textWidth = ctx.measureText(label).width
                const padding = fontSize * 0.8 // Increased padding
                const height = fontSize * 1.8 // Fixed height for pill shape
                const width = textWidth + padding * 2 // Add padding to both sides

                // Draw rounded rectangle background
                ctx.fillStyle = "#f1f1f1" // Light gray background
                const radius = height / 2 // Radius for pill shape

                ctx.beginPath()
                ctx.moveTo(node.x - width / 2 + radius, node.y - height / 2)
                ctx.lineTo(node.x + width / 2 - radius, node.y - height / 2)
                ctx.arcTo(node.x + width / 2, node.y - height / 2, node.x + width / 2, node.y, radius)
                ctx.lineTo(node.x + width / 2, node.y + height / 2 - radius)
                ctx.arcTo(node.x + width / 2, node.y + height / 2, node.x + width / 2 - radius, node.y + height / 2, radius)
                ctx.lineTo(node.x - width / 2 + radius, node.y + height / 2)
                ctx.arcTo(node.x - width / 2, node.y + height / 2, node.x - width / 2, node.y + height / 2 - radius, radius)
                ctx.lineTo(node.x - width / 2, node.y - height / 2 + radius)
                ctx.arcTo(node.x - width / 2, node.y - height / 2, node.x - width / 2 + radius, node.y - height / 2, radius)
                ctx.fill()

                // Draw text
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"
                ctx.fillStyle = "#000000" // Dark text color
                ctx.fillText(label, node.x, node.y)
            }
        },
        [hoverNode],
    )

    useEffect(() => {
        if (graphRef && graphRef.current)
            graphRef.current
                .d3Force("link", undefined)
                .iterations(1)
                .distance(220);

    }, [graphRef, graphRef.current, nodes, edges])
    return (
        <div className="relative h-[calc(100vh_-_48px)]">
            <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => graphRef.current?.zoomToFit(400)}>
                                <AlignCenterVertical className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Auto layout</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => setView("flow-graph")}
                        >
                            <PencilRulerIcon className='h-4 w-4' />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Editor
                    </TooltipContent>
                </Tooltip>
            </div>
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
                <Button size="icon" disabled={reloading} variant="outline" onClick={refetch}>
                    <RotateCwIcon className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
                </Button>
            </div>
            <ForceGraph2D
                nodeAutoColorBy="group"
                ref={graphRef}
                graphData={graphData}
                nodeRelSize={NODE_R}
                nodeColor={(node: any) => ("transparent")}
                linkWidth={(link: any) => (highlightLinks.has(`${(link.source as ForceGraphNode).id}-${(link.target as ForceGraphNode).id}`) ? 2 : 1)}
                linkDirectionalParticles={4}
                linkDirectionalParticleWidth={(link: any) => (highlightLinks.has(`${(link.source as ForceGraphNode).id}-${(link.target as ForceGraphNode).id}`) ? 2 : 0)}
                nodeCanvasObjectMode={() => "after"}
                nodeCanvasObject={Node}
                onNodeHover={handleNodeHover}
                onNodeClick={handleNodeClick}
                backgroundColor={"transparent"}
            />
        </div>
    )
}

export default function LargeInvestigationGraph({ graphQuery }: LargeInvestigationGraphProps) {
    const [mounted, setMounted] = useState(false)
    const { refetch, isLoading, data } = graphQuery
    const { resolvedTheme } = useTheme()

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (data) {
            useFlowStore.setState({
                nodes: data?.nodes.map(node => ({
                    ...node,
                    position: { x: node.x ?? 0, y: node.y ?? 0 },
                    data: node
                })),
                edges: data?.edges.map(edge => ({
                    ...edge,
                    id: `${edge.source}-${edge.target}`
                }))
            })
            setMounted(true)
        }
    }, [data, data?.nodes, data?.edges])

    if (!mounted || isLoading) {
        return (
            <div className="h-[calc(100vh_-_48px)] w-full flex items-center justify-center">
                <Loader /> Loading...
            </div>
        )
    }

    return <LayoutFlow refetch={refetch} isLoading={isLoading} theme={resolvedTheme as string} />
}