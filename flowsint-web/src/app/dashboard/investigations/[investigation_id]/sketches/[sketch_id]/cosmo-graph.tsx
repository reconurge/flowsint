// components/Graph.tsx

"use client"

import { useCallback, useEffect } from "react"
import { Cosmograph, CosmographProvider, useCosmograph } from '@cosmograph/react'
import { EdgeData, NodeData } from "@/types"
import { useSketchStore } from "@/store/sketch-store"
import { shallow } from "zustand/shallow"
import { useNodesDisplaySettings } from "@/store/node-display-settings"
import Loader from "@/components/loader"
import { Button } from "@/components/ui/button"
import NewActions from "@/components/sketches/new-actions"
import { PlusIcon } from "lucide-react"
import { useGraphControls } from "@/store/graph-controls-store"
import { CosmosInputNode } from "@cosmograph/cosmos"

interface GraphProps {
    isLoading: boolean
    data: { nds: NodeData[]; rls: EdgeData[] }
    width?: number
    height?: number
}

const stateSelector = (state: {
    currentNode: NodeData | null
    nodes: NodeData[]
    edges: EdgeData[]
    setNodes: any
    setEdges: any
    toggleNodeSelection: (node: NodeData, multiSelect: boolean) => void
    clearSelectedNodes: () => void
}) => ({
    nodes: state.nodes,
    edges: state.edges,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    toggleNodeSelection: state.toggleNodeSelection,
    clearSelectedNodes: state.clearSelectedNodes,
    currentNode: state.currentNode,
})

const randomIntFromInterval = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

const getRandDate = (): Date => {
    return new Date(randomIntFromInterval(0, 10000000))
}

const GraphContent = () => {
    const {
        toggleNodeSelection,
        clearSelectedNodes,
        currentNode
    } = useSketchStore(stateSelector, shallow)

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
            onLabelClick={onLabelClick}
            onClick={onNodeClick}
            disableSimulation={true}
            backgroundColor={"transparent"}
            nodeSize={(n: any) => getSize(n.type)}
            nodeColor={(n: CosmosInputNode & { type?: string }) => colors[n.type as keyof typeof colors] || "#000000"}
            nodeLabelColor={(n: CosmosInputNode & { type?: string }) => colors[n.type as keyof typeof colors] || "#000000"}
            nodeLabelAccessor={(n: any) => n.label}
        />
    )
}

const Graph: React.FC<GraphProps> = ({ data, isLoading }) => {
    const { setNodes, setEdges, nodes, edges, currentNode } = useSketchStore(stateSelector, shallow)

    useEffect(() => {
        if (isLoading) return
        if (data?.nds) setNodes(data.nds)
        if (data?.rls) setEdges(data.rls.map((edge: EdgeData) => ({
            ...edge,
            source: edge.from,
            target: edge.to,
            id: `${edge.from}-${edge.to}`,
            date: getRandDate()
        })))
    }, [data?.nds, data?.rls, isLoading, setNodes, setEdges])

    if (isLoading) {
        return <Loader label="Loading..." />
    }

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
        )
    }

    return (
        <div className="relative h-full w-full flex flex-col bg-card">
            <CosmographProvider nodes={nodes} links={edges}>
                <GraphContent />
            </CosmographProvider>
        </div>
    )
}

export default Graph
