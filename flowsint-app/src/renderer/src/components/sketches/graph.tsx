import { useCallback, useEffect, memo, lazy, Suspense, useRef, useState } from "react"
import { Cosmograph, CosmographProvider, useCosmograph } from '@cosmograph/react'
import { useSketchStore } from "@/stores/sketch-store"
import { useNodesDisplaySettings } from "@/stores/node-display-settings"
import Loader from "@/components/shared/loader"
import { Button } from "@/components/ui/button"
import NewActions from "@/components/sketches/new-actions"
import { PlusIcon } from "lucide-react"
import { useGraphControls } from "@/stores/graph-controls-store"
// @ts-ignore
import { type CosmosInputNode } from "@cosmograph/cosmos"
import { ResizablePanel, ResizablePanelGroup } from "../ui/resizable"
import Legend from "./legend"

// Lazy loading du timeline
const CosmographTimeline = lazy(() =>
    import('@cosmograph/react').then(module => ({ default: module.CosmographTimeline }))
)
// Hook pour tracker l'état de chargement de Cosmograph
const useCosmographLoader = (nodes: any[], edges: any[]) => {
    const [isCosmographReady, setIsCosmographReady] = useState(true)
    const [loadingStage, setLoadingStage] = useState<'importing' | 'simulating' | 'rendering' | 'ready'>('ready')
    const cosmograph = useCosmograph()
    const dataVersionRef = useRef(0)

    useEffect(() => {
        // Reset l'état quand les données changent
        dataVersionRef.current += 1
        setIsCosmographReady(false)
        setLoadingStage('importing')
        if (!cosmograph?.cosmograph || nodes.length === 0) {
            setIsCosmographReady(true)
            setLoadingStage('ready')
            return
        }
        // Skip simulation if no edges
        if (edges.length === 0) {
            setIsCosmographReady(true)
            setLoadingStage('ready')
            return
        }
        setLoadingStage('simulating')
    }, [cosmograph?.cosmograph, nodes.length, edges.length])

    const handleSimulationStart = useCallback(() => {
        if (edges.length > 0) {
            setLoadingStage('simulating')
            setIsCosmographReady(false)
        }
    }, [edges.length])

    const handleSimulationEnd = useCallback(() => {
        setLoadingStage('ready')
        setIsCosmographReady(true)
    }, [])

    return { isCosmographReady, loadingStage, handleSimulationStart, handleSimulationEnd }
}

// Composant de loader personnalisé pour Cosmograph
const CosmographLoader = memo(({ stage }: { stage: string }) => (
    <div className="absolute  inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
        <Loader />
        <div className="mt-4 text-sm text-muted-foreground">
            {stage === 'importing' && 'Importing graph data...'}
            {stage === 'simulating' && 'Running simulation...'}
            {stage === 'rendering' && 'Rendering graph...'}
        </div>
    </div>
))
CosmographLoader.displayName = "CosmographLoader"

// Composant mémorisé pour l'état vide
const EmptyState = memo(() => (
    <div className="flex relative bg-background gap-3 h-full flex-col w-full items-center justify-center">
        Your nodes will be displayed here.
        <NewActions>
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-6 py-2 text-white border-none">
                Add your first item <PlusIcon />
            </Button>
        </NewActions>
    </div>
))
EmptyState.displayName = "EmptyState"

const GRAPH_CONFIG = {
    // simulationCenter: 0.2,
    useQuadtree: true,
    simulationDecay: 100,
    simulationGravity: 0.25,
    // simulationLinkSpring: 2,
    simulationRepulsion: 2,
    // simulationRepulsionTheta: 1.15,
    linkStrength: 1,
    simulationLinkDistance: .1,
    nodeSizeScale: 0.1,

    // simulationLinkDistance: 6,
    backgroundColor: "transparent" as const,
}

const GraphContent = memo(() => {
    const nodes = useSketchStore(s => s.nodes)
    const edges = useSketchStore(s => s.edges)
    const currentNode = useSketchStore(s => s.currentNode)
    const { isCosmographReady, loadingStage, handleSimulationStart, handleSimulationEnd } = useCosmographLoader(nodes, edges)
    const clearSelectedNodes = useSketchStore(s => s.clearSelectedNodes)
    const toggleNodeSelection = useSketchStore(s => s.toggleNodeSelection)
    const colors = useNodesDisplaySettings(s => s.colors)
    const getSize = useNodesDisplaySettings(s => s.getSize)
    const getIcon = useNodesDisplaySettings(s => s.getIcon)
    const setActions = useGraphControls(s => s.setActions)

    const cosmograph = useCosmograph()
    const actionsSetRef = useRef(false)

    // Callbacks stables - créés une seule fois
    const handleLabelClick = useCallback((node: any, event: MouseEvent) => {

        const multiSelect = event.ctrlKey || event.shiftKey || event.altKey
        toggleNodeSelection(node, multiSelect)
        cosmograph?.cosmograph?.zoomToNode(node)
    }, [toggleNodeSelection, cosmograph?.cosmograph])

    const handleNodeClick = useCallback((clickedNode?: any, index?: number, nodePosition?: [number, number], event?: MouseEvent) => {
        if (!clickedNode) {
            clearSelectedNodes()
            return
        }
        if (event) {
            const multiSelect = event.ctrlKey || event.shiftKey || event.altKey
            toggleNodeSelection(clickedNode, multiSelect)
            cosmograph?.cosmograph?.zoomToNode(clickedNode)
        } else {
            cosmograph?.cosmograph?.zoomToNode(clickedNode)
        }
    }, [toggleNodeSelection, clearSelectedNodes, cosmograph?.cosmograph])

    // Fonctions de style stables
    const nodeColorFunction = useCallback((n: CosmosInputNode & { type?: string }) =>
        colors[n.type as keyof typeof colors] || "#000000", [colors])

    const nodeSizeFunction = useCallback((n: any) => getSize(n.type), [getSize])

    const nodeLabelFunction = useCallback((n: any) => `${getIcon(n.data.type)} ${n.label}`, [getIcon])

    // Fit view to all nodes on first render
    //@ts-ignore
    useEffect(() => {
        if (cosmograph?.cosmograph && isCosmographReady) {
            const timeoutId = setTimeout(() => {
                cosmograph.cosmograph?.fitView(500)
            }, 100)

            return () => clearTimeout(timeoutId)
        }
    }, [cosmograph?.cosmograph, isCosmographReady])

    // Configuration des actions une seule fois
    useEffect(() => {
        if (cosmograph?.cosmograph && !actionsSetRef.current) {
            const actions = {
                zoomIn: () => {
                    const current = cosmograph.cosmograph?.getZoomLevel()
                    const zoomLevel = current ? current * 1.5 : 1.5
                    cosmograph.cosmograph?.setZoomLevel(zoomLevel, 200)
                },
                zoomToFit: () => {
                    cosmograph.cosmograph?.fitView(200)
                },
                zoomOut: () => {
                    const current = cosmograph.cosmograph?.getZoomLevel()
                    const zoomLevel = current ? current * 0.5 : 0.5
                    cosmograph.cosmograph?.setZoomLevel(zoomLevel, 200)
                },
            }

            setActions(actions)
            cosmograph.cosmograph.restart()
            actionsSetRef.current = true
        }
    }, [cosmograph?.cosmograph, setActions])

    //@ts-ignore
    useEffect(() => {
        if (currentNode && cosmograph?.cosmograph && isCosmographReady) {
            const timeoutId = setTimeout(() => {
                cosmograph.cosmograph?.zoomToNode(currentNode)
                cosmograph.cosmograph?.focusNode(currentNode)
            }, 100)

            return () => clearTimeout(timeoutId)
        }
    }, [currentNode, cosmograph?.cosmograph, isCosmographReady])

    return (
        <div className="relative h-full w-full">
            <Cosmograph
                {...GRAPH_CONFIG}
                onSimulationStart={handleSimulationStart}
                onSimulationEnd={handleSimulationEnd}
                onLabelClick={handleLabelClick}
                onClick={handleNodeClick}
                nodeSize={nodeSizeFunction}
                nodeColor={nodeColorFunction}
                nodeLabelColor={nodeColorFunction}
                nodeLabelAccessor={nodeLabelFunction}
            />
            {!isCosmographReady && nodes.length > 0 && (
                <CosmographLoader stage={loadingStage} />
            )}
        </div>
    )
})
GraphContent.displayName = "GraphContent"

// Timeline avec ses propres optimisations
const TimelinePanel = memo(() => {
    const handleAnimationPlay = useCallback(() => {
    }, [])

    const dateAccessor = useCallback((d: any) => d.data.created_at, [])

    return (
        <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading timeline...</div>}>
            <CosmographTimeline
                className="!bg-background !h-full"
                // @ts-ignore
                accessor={dateAccessor}
                animationSpeed={20}
                showAnimationControls
                onAnimationPlay={handleAnimationPlay}
            />
        </Suspense>
    )
})
TimelinePanel.displayName = "TimelinePanel"

// Provider wrapper mémorisé pour éviter les re-créations
const GraphProvider = memo(({ nodes, edges, children }: {
    nodes: any[],
    edges: any[],
    children: React.ReactNode
}) => {
    // Transform edges to use source/target instead of from/to
    const transformedEdges = edges.map(edge => ({
        ...edge,
        source: edge.from,
        target: edge.to
    }))

    return (
        <CosmographProvider nodes={nodes} links={transformedEdges}>
            {children}
        </CosmographProvider>
    )
})
GraphProvider.displayName = "GraphProvider"

// Composant principal avec optimisations maximales
const Graph = memo(() => {
    const nodes = useSketchStore(s => s.nodes)
    const edges = useSketchStore(s => s.edges)

    if (!nodes.length) {
        return <EmptyState />
    }
    return (
        <div className="relative h-full grow w-full flex flex-col bg-background min-h-0">
            <GraphProvider nodes={nodes} edges={edges}>
                <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0 h-full flex flex-col">
                    <ResizablePanel defaultSize={75} minSize={30} className="flex-grow min-h-0 inset-shadow">
                        <GraphContent />
                    </ResizablePanel>
                    {/* <ResizableHandle /> */}
                    {/* <ResizablePanel defaultSize={25} minSize={10} className="flex-grow h-full min-h-0 inset-shadow">
                        <TimelinePanel />
                    </ResizablePanel> */}
                </ResizablePanelGroup>
            </GraphProvider>
            <Legend />
        </div>
    )
})
Graph.displayName = "Graph"

export default Graph