"use client"
import Loader from '@/components/loader'
import NewActions from '@/components/sketches/new-actions'
import { Button } from '@/components/ui/button'
import { useFlowStore } from '@/store/flow-store'
import type { HitTargets, Node, NVL, Relationship } from '@neo4j-nvl/base'
import { InteractiveNvlWrapper } from '@neo4j-nvl/react'
import type { MouseEventCallbacks } from '@neo4j-nvl/react'
import { PlusIcon } from 'lucide-react'
import React, { memo, useEffect, useRef, useState } from 'react'
import { shallow } from 'zustand/shallow'

const stateSelector = (state: { setCurrentNode: any }) => ({
    setCurrentNode: state.setCurrentNode,
})


interface Neo4jGraphProps {
    isLoading: boolean
    data: { nodes: Node[], rels: Relationship[] }
}
const Neo4jGraph = ({ data, isLoading }: Neo4jGraphProps) => {
    const nvl = useRef<NVL | null>(null)
    const [nds, setNodes] = useState<Node[]>([])
    const [rls, setRels] = useState<Relationship[]>([])

    const {
        setCurrentNode,
    } = useFlowStore(stateSelector, shallow);

    useEffect(() => {
        if (isLoading) return
        if (data?.nodes) setNodes(data.nodes)
        if (data?.rels) setRels(data.rels)
    }, [data?.nodes, data?.rels, isLoading, setNodes, setRels])

    const fitNodes = () => {
        nvl.current?.fit(nds.map((n) => n.id))
    }

    const resetZoom = () => {
        nvl.current?.resetZoom()
    }

    const addNode = (newNode: any) => {
        const newNodes = [...nds, {...newNode, caption: newNode.label}]
        setNodes(newNodes)
    }

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

    if (isLoading) return <div className='flex h-full w-full items-center justify-center'>Loading <Loader /></div>
    return <div className='relative h-full w-full'>
        <div className='top-3 left-3 absolute z-50'>
            <NewActions addNodes={addNode}>
                <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-6 py-2 text-white border-none" size="icon">
                    <PlusIcon />
                </Button>
            </NewActions>
        </div>
        <InteractiveNvlWrapper ref={nvl} nodes={nds} rels={rls} mouseEventCallbacks={mouseEventCallbacks} />
    </div>
}
export default memo(Neo4jGraph)