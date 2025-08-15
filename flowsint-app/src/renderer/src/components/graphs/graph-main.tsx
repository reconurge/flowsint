import { useGraphStore } from '@/stores/graph-store'
import React, { useEffect, useRef, useCallback } from 'react'
import GraphViewer from './graph-viewer'
import ContextMenu from './context-menu'

const GraphMain = () => {
    const nodes = useGraphStore(s => s.nodes)
    const edges = useGraphStore(s => s.edges)
    const currentNode = useGraphStore(s => s.currentNode)
    const toggleNodeSelection = useGraphStore(s => s.toggleNodeSelection)
    const clearSelectedNodes = useGraphStore(s => s.clearSelectedNodes)

    const graphRef = useRef<any>()
    const containerRef = useRef<HTMLDivElement>(null)
    const [menu, setMenu] = React.useState<any>(null)

    // Handle current node centering
    useEffect(() => {
        if (!currentNode || !graphRef.current) return
        graphRef.current.centerAt(currentNode.x, currentNode.y, 500)
        graphRef.current.zoom(5, 500)
    }, [currentNode])

    const handleNodeClick = useCallback((node: any) => {
        toggleNodeSelection(node, false)
    }, [toggleNodeSelection])

    const handleBackgroundClick = useCallback(() => {
        clearSelectedNodes()
        setMenu(null)
    }, [clearSelectedNodes])

    const onNodeContextMenu = useCallback((node: any, event: MouseEvent) => {
        if (!containerRef.current || !node) return

        const pane = containerRef.current.getBoundingClientRect()
        const relativeX = event.clientX - pane.left
        const relativeY = event.clientY - pane.top

        setMenu({
            node: {
                data: node.data || {},
                id: node.id || '',
                label: node.label || node.nodeLabel || '',
                position: node.position || { x: node.x || 0, y: node.y || 0 }
            },
            rawTop: relativeY,
            rawLeft: relativeX,
            wrapperWidth: pane.width,
            wrapperHeight: pane.height,
            setMenu: setMenu,
        })
    }, [])

    const handleGraphRef = useCallback((ref: any) => {
        graphRef.current = ref
    }, [])

    return (
        <div ref={containerRef} className="relative h-full w-full bg-background">
            <GraphViewer
                nodes={nodes}
                edges={edges}
                onNodeClick={handleNodeClick}
                onNodeRightClick={onNodeContextMenu}
                onBackgroundClick={handleBackgroundClick}
                showLabels={true}
                showIcons={true}
                onGraphRef={handleGraphRef}
            />
            {menu && <ContextMenu onClick={handleBackgroundClick} {...menu} />}
        </div>
    )
}

export default GraphMain