"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { AlignCenterVertical, PencilRulerIcon, RotateCwIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useFlowStore } from "../../../store/flow-store"
import Loader from "../../loader"
import { useQueryState } from "nuqs"
// @ts-ignore
import * as d3 from 'd3'

// Import ForceGraph2D with types
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })

// Constants
const NODE_R = 8
const GROUPS_COLORS = {
    individual: "#ff6b6b",
    email: "#4ecdc4",
    phone: "#45b7d1",
    address: "#96ceb4",
    social: "#ffeead",
}

// Types
interface NodeData {
    id: string
    color?: string
    x?: number
    y?: number
    group?: string
    [key: string]: any
}

interface EdgeData {
    source: string
    target: string
    type?: string
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
    const graphRef = useRef<any>(null)
    const [zoomLevel, setZoomLevel] = useState(1)

    const { nodes, edges, reloading } = useFlowStore()

    // Amélioration du groupement des nœuds
    const getNodeGroup = useCallback((node: NodeData) => {
        if (node.data?.type?.includes("individual")) return "individual"
        if (node.data?.type?.includes("email")) return "email"
        if (node.data?.type?.includes("phone")) return "phone"
        if (node.data?.type?.includes("address")) return "address"
        if (node.data?.type?.includes("social")) return "social"
        return "other"
    }, [])

    // Convert data for ForceGraph with improved grouping
    const graphData: GraphData = useMemo(() => {
        return {
            nodes: nodes.map((node) => ({
                id: node.id,
                ...node.data,
                group: getNodeGroup(node),
                color: GROUPS_COLORS[getNodeGroup(node) as keyof typeof GROUPS_COLORS] || "#666",
            })),
            links: edges.map((edge) => ({
                source: edge.source,
                target: edge.target,
                ...edge.data,
            })),
        }
    }, [nodes, edges, getNodeGroup])

    // Amélioration du rendu des nœuds
    const Node = useCallback(
        (node: any, ctx: CanvasRenderingContext2D) => {
            if (node.x === undefined || node.y === undefined) return

            const label = node.data.label
            const fontSize = 12
            ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
            const textWidth = ctx.measureText(label).width
            const padding = 12
            const height = 24
            const width = textWidth + padding * 2

            // Dessiner l'ombre
            ctx.shadowColor = "rgba(0, 0, 0, 0.1)"
            ctx.shadowBlur = 5
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 2

            // Dessiner le fond
            ctx.fillStyle = node.color
            const radius = height / 2

            // Créer le chemin pour la forme de pilule
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

            // Réinitialiser l'ombre pour le texte
            ctx.shadowColor = "transparent"

            // Dessiner le texte
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillStyle = theme === "dark" ? "#fff" : "#000"
            ctx.fillText(label, node.x, node.y)

            // Ajouter un effet de surbrillance pour les nœuds en survol
            if (highlightNodes.has(node.id)) {
                ctx.strokeStyle = theme === "dark" ? "#fff" : "#000"
                ctx.lineWidth = 2
                ctx.stroke()
            }
        },
        [highlightNodes, theme],
    )

    // Amélioration des interactions
    const handleNodeHover = useCallback(
        (node: ForceGraphNode | null) => {
            setHoverNode(node)
            setHighlightNodes(new Set(node ? [node.id] : []))

            // Mettre en évidence les liens connectés
            const connectedLinks = new Set<string>()
            if (node) {
                edges.forEach((edge) => {
                    if (edge.source === node.id || edge.target === node.id) {
                        connectedLinks.add(`${edge.source}-${edge.target}`)
                        // Ajouter les nœuds connectés à la surbrillance
                        // @ts-ignore
                        setHighlightNodes((prev) => new Set([...prev, edge.source, edge.target]))
                    }
                })
            }
            setHighlightLinks(connectedLinks)
        },
        [edges],
    )

    const handleNodeClick = useCallback((node: ForceGraphNode, event: MouseEvent) => {
        if (node && graphRef.current) {
            // Zoom plus fluide et naturel
            const distance = 13000
            graphRef.current.centerAt(node.x, node.y, distance)
            graphRef.current.zoom(2.5, distance)
        }
    }, [])

    useEffect(() => {
        if (graphRef.current) {
            // Significantly increase repulsion force
            graphRef.current
                .d3Force("link")
                .distance(() => 2100) // Increase from 150 to 200
                .strength(0.1) // Decrease from 0.2 to 0.1 for more flexibility
                
            graphRef.current
                .d3Force("charge")
                .strength(-400) // Double the repulsion from -200 to -400
                .distanceMax(5100) // Increase from 250 to 500
                
            // Add this to improve initial positioning
            graphRef.current.d3Force("x", d3.forceX().strength(0.05))
            graphRef.current.d3Force("y", d3.forceY().strength(0.05))
        }
    }, [])

    const handleZoomIn = useCallback(() => {
        if (graphRef.current) {
            const currentZoom = graphRef.current.zoom()
            graphRef.current.zoom(currentZoom * 1.2, 400)
        }
    }, [])

    const handleZoomOut = useCallback(() => {
        if (graphRef.current) {
            const currentZoom = graphRef.current.zoom()
            graphRef.current.zoom(currentZoom / 1.2, 400)
        }
    }, [])

    return (
        <div className="relative w-full h-[calc(100vh_-_48px)]">
            <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => graphRef.current?.zoomToFit(400)}>
                                <AlignCenterVertical className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Fit view</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={handleZoomIn}>
                                <ZoomInIcon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom in</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={handleZoomOut}>
                                <ZoomOutIcon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom out</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => setView("flow-graph")}>
                                <PencilRulerIcon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Switch to editor</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
                <Button size="icon" disabled={reloading} variant="outline" onClick={refetch}>
                    <RotateCwIcon className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
                </Button>
            </div>

            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeRelSize={NODE_R}
                nodeCanvasObject={Node}
                nodeCanvasObjectMode={() => "after"}
                linkColor={() => (theme === "dark" ? "#ffffff33" : "#00000033")}
                linkWidth={(link: any) =>
                    highlightLinks.has(`${(link.source as ForceGraphNode).id}-${(link.target as ForceGraphNode).id}`) ? 2 : 1
                }
                linkDirectionalParticles={4}
                linkDirectionalParticleWidth={(link: any) =>
                    highlightLinks.has(`${(link.source as ForceGraphNode).id}-${(link.target as ForceGraphNode).id}`) ? 2 : 0
                }
                linkDirectionalParticleColor={() => (theme === "dark" ? "#fff" : "#000")}
                // @ts-ignore
                onNodeHover={handleNodeHover}
                // @ts-ignore
                onNodeClick={handleNodeClick}
                backgroundColor="transparent"
                d3AlphaDecay={0.01} // Ralentir la stabilisation pour un meilleur layout
                d3VelocityDecay={0.4} // Amortissement du mouvement
                cooldownTime={3000} // Temps de stabilisation plus long
                onEngineStop={() => {
                    // Ajuster la position des nœuds après la stabilisation
                    if (graphRef.current) {
                        graphRef.current.zoomToFit(400)
                    }
                }}
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
                nodes: data?.nodes.map((node) => ({
                    ...node,
                    position: { x: node.x ?? 0, y: node.y ?? 0 },
                    data: node,
                })),
                edges: data?.edges.map((edge) => ({
                    ...edge,
                    id: `${edge.source}-${edge.target}`,
                })),
            })
            setMounted(true)
        }
    }, [data])

    if (!mounted || isLoading) {
        return (
            <div className="h-[calc(100vh_-_48px)] w-full flex items-center justify-center">
                <Loader /> Loading...
            </div>
        )
    }

    return <LayoutFlow refetch={refetch} isLoading={isLoading} theme={resolvedTheme as string} />
}

