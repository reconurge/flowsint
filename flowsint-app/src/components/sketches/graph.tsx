import { useCallback, useEffect } from "react"
import { Cosmograph, CosmographProvider, CosmographTimeline, useCosmograph } from '@cosmograph/react'
import { useSketchStore } from "@/store/sketch-store"
import { useNodesDisplaySettings } from "@/store/node-display-settings"
import Loader from "@/components/shared/loader"
import { Button } from "@/components/ui/button"
import NewActions from "@/components/sketches/new-actions"
import { PlusIcon } from "lucide-react"
import { useGraphControls } from "@/store/graph-controls-store"
// @ts-ignore
import { type CosmosInputNode } from "@cosmograph/cosmos"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/resizable"

interface GraphProps {
    isLoading: boolean
}
const GraphContent = () => {

    const currentNode = useSketchStore(s => s.currentNode)
    const clearSelectedNodes = useSketchStore(s => s.clearSelectedNodes)
    const toggleNodeSelection = useSketchStore(s => s.toggleNodeSelection)

    const colors = useNodesDisplaySettings(s => s.colors)
    const getSize = useNodesDisplaySettings(s => s.getSize)
    const setActions = useGraphControls((s) => s.setActions)

    const cosmograph = useCosmograph()

    useEffect(() => {
        setActions({
            zoomIn: () => {
                const current = cosmograph?.cosmograph?.getZoomLevel()
                const zoomOutLevel = current ? current * 1.5 : 1.5
                cosmograph?.cosmograph?.setZoomLevel(zoomOutLevel, 500)
            },
            zoomToFit: () => {
                cosmograph?.cosmograph?.fitView(500)
            },
            zoomOut: () => {
                const current = cosmograph?.cosmograph?.getZoomLevel()
                const zoomOutLevel = current ? current * 0.5 : 0.5
                cosmograph?.cosmograph?.setZoomLevel(zoomOutLevel, 500)
            },
        });
        cosmograph?.cosmograph?.restart()
    }, [cosmograph?.cosmograph, setActions])

    useEffect(() => {
        if (currentNode) {
            cosmograph?.cosmograph?.zoomToNode(currentNode)
            cosmograph?.cosmograph?.focusNode(currentNode)
            cosmograph?.cosmograph?.fitViewByNodeIds
        }
    }, [currentNode, cosmograph?.cosmograph])

    const onLabelClick = useCallback((node: any, event: MouseEvent) => {
        const multiSelect = event.ctrlKey || event.shiftKey || event.altKey
        toggleNodeSelection(node, multiSelect)
        cosmograph?.cosmograph?.zoomToNode(node)
    }, [toggleNodeSelection, cosmograph?.cosmograph])

    //@ts-ignore
    const onNodeClick = useCallback((clickedNode?: any, index?: number, nodePosition?: [number, number], event: MouseEvent) => {
        if (!clickedNode) {
            clearSelectedNodes()
            return
        }
        const multiSelect = event.ctrlKey || event.shiftKey || event.altKey
        toggleNodeSelection(clickedNode, multiSelect)
        cosmograph?.cosmograph?.fitViewByNodeIds([clickedNode.id])
    }, [toggleNodeSelection, cosmograph?.cosmograph])

    return (
        <Cosmograph
            simulationCenter={.05}
            simulationDecay={100}
            simulationRepulsion={50}
            simulationLinkDistance={1}
            onLabelClick={onLabelClick}
            onClick={onNodeClick}
            // disableSimulation={true}
            backgroundColor={"transparent"}
            nodeSize={(n: any) => getSize(n.type)}
            nodeColor={(n: CosmosInputNode & { type?: string }) => colors[n.type as keyof typeof colors] || "#000000"}
            nodeLabelColor={(n: CosmosInputNode & { type?: string }) => colors[n.type as keyof typeof colors] || "#000000"}
            nodeLabelAccessor={(n: any) => n.label}
        />
    )
}

const Graph: React.FC<GraphProps> = ({ isLoading }) => {
    const nodes = useSketchStore(s => s.nodes)
    const edges = useSketchStore(s => s.edges)

    if (isLoading) {
        return <Loader />
    }

    if (!nodes.length) {
        return (
            <div className="flex relative bg-background gap-3 h-full flex-col w-full items-center justify-center">
                Your nodes will be displayed here.
                <NewActions>
                    <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-6 py-2 text-white border-none">
                        Add your first item <PlusIcon />
                    </Button>
                </NewActions>
            </div>
        )
    }

    return (
        <div className="relative h-full w-full flex flex-col bg-background">
            <CosmographProvider nodes={nodes} links={edges}>
                <ResizablePanelGroup direction="vertical" className="h-full">
                    {/* Panneau principal pour le graphique */}
                    <ResizablePanel defaultSize={75} minSize={30}>
                        <GraphContent />
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={10} minSize={7}>
                        <CosmographTimeline
                            // @ts-ignore
                            accessor={d => d.date}
                            animationSpeed={20}
                            showAnimationControls
                            onAnimationPlay={() => console.log('Animation started')}
                        />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </CosmographProvider>
        </div>
    )
}

export default Graph
