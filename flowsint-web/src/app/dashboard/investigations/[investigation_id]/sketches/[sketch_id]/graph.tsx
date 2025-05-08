"use client"
import Loader from '@/components/loader'
import NewActions from '@/components/sketches/new-actions'
import { Button } from '@/components/ui/button'
import { useSketchStore } from '@/store/sketch-store'
import type { HitTargets, Node, NVL, Relationship } from '@neo4j-nvl/base'
import { ZoomInteraction } from '@neo4j-nvl/interaction-handlers'
import type { MouseEventCallbacks } from '@neo4j-nvl/react'
import { PlusIcon } from 'lucide-react'
import React, { memo, useEffect, useRef, useState } from 'react'
import { shallow } from 'zustand/shallow'
import dynamic from 'next/dynamic'

const InteractiveNvlWrapper = dynamic(
    () => import('@neo4j-nvl/react').then(mod => mod.InteractiveNvlWrapper),
    { ssr: false }
)

const stateSelector = (state: { setCurrentNode: any, nodes: Node[], edges: Relationship[], setNodes: any, setEdges: any, addNode: any }) => ({
    setCurrentNode: state.setCurrentNode,
    nodes: state.nodes,
    edges: state.edges,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    addNode: state.addNode
})

interface Neo4jGraphProps {
    isLoading: boolean,
    minimapRef: any
    data: { nds: Node[], rls: Relationship[] }
}

const Neo4jGraph = ({ data, isLoading, minimapRef }: Neo4jGraphProps) => {
    const nvl = useRef<NVL | null>(null)
    const [ready, setReady] = useState<boolean>(false)

    const {
        setCurrentNode,
        addNode,
        setNodes,
        setEdges,
        nodes,
        edges
    } = useSketchStore(stateSelector, shallow);

    // S'assurer que nous sommes côté client
    useEffect(() => {
        if (minimapRef && minimapRef.current) {
            setReady(true)
        }
    }, [minimapRef])



    useEffect(() => {
        if (isLoading) return
        if (data?.nds) setNodes(data.nds)
        if (data?.rls) setEdges(data.rls)
    }, [data?.nds, data?.rls, isLoading, setNodes, setEdges])

    const mouseEventCallbacks: MouseEventCallbacks = {
        onHover: (element: Node | Relationship, hitTargets: HitTargets, evt: MouseEvent) => { },
        onRelationshipRightClick: (rel: Relationship, hitTargets: HitTargets, evt: MouseEvent) => { },
        onNodeClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) =>
            setCurrentNode(node),
        onNodeRightClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) => { },
        onNodeDoubleClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) => { },
        onRelationshipClick: (rel: Relationship, hitTargets: HitTargets, evt: MouseEvent) => { },
        onRelationshipDoubleClick: (rel: Relationship, hitTargets: HitTargets, evt: MouseEvent) => { },
        onCanvasClick: (evt: MouseEvent) => setCurrentNode(null),
        onCanvasDoubleClick: (evt: MouseEvent) => { },
        onCanvasRightClick: (evt: MouseEvent) => { },
        onDrag: (nodes: Node[]) => { },
        onPan: (panning: { x: number; y: number }, evt: MouseEvent) => { },
        onZoom: (zoomLevel: number) => { },
    }

    if (isLoading || !ready) return <div className='flex h-full w-full items-center justify-center'>Loading <Loader /></div>

    if (!isLoading && ready && !nodes.length) return <div className='flex relative gap-3 h-full flex-col w-full items-center justify-center'>

        Your nodes will be displayed here.
        <NewActions addNodes={addNode}>
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-6 py-2 text-white border-none">
                Add your first item <PlusIcon />
            </Button>
        </NewActions></div>

    return (
        <div className='relative h-full w-full'>
            <div className='top-3 left-3 absolute z-50'>
                <NewActions addNodes={addNode}>
                    <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-6 py-2 text-white border-none" size="icon">
                        <PlusIcon />
                    </Button>
                </NewActions>
            </div>
            <InteractiveNvlWrapper
                nvlOptions={{
                    renderer: "canvas",
                    minimapContainer: minimapRef?.current
                }}
                ref={nvl}
                nodes={nodes}
                rels={edges}
                mouseEventCallbacks={mouseEventCallbacks}
            />
        </div>
    )
}

export default memo(Neo4jGraph)