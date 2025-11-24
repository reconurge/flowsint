import { useGraphStore } from '@/stores/graph-store'
import React, { useRef, useCallback } from 'react'
import GraphViewer from './graph-viewer'
// import WebGLGraphViewer from './webgl'
import NodeContextMenu from './node-context-menu'
import BackgroundContextMenu from './background-context-menu'
import { useParams } from '@tanstack/react-router'

const GraphMain = () => {
  const { id: sketchId } = useParams({ strict: false })
  const filteredNodes = useGraphStore((s) => s.filteredNodes)
  const filteredEdges = useGraphStore((s) => s.filteredEdges)
  const toggleNodeSelection = useGraphStore((s) => s.toggleNodeSelection)
  const clearSelectedNodes = useGraphStore((s) => s.clearSelectedNodes)
  const selectedNodes = useGraphStore(s => s.selectedNodes)

  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodeMenu, setNodeMenu] = React.useState<any>(null)
  const [background, setBackgroundMenu] = React.useState<any>(null)

  const handleNodeClick = useCallback(
    (node: any, event: MouseEvent) => {
      const isMultiSelect = event.ctrlKey || event.shiftKey
      toggleNodeSelection(node, isMultiSelect)
    },
    [toggleNodeSelection]
  )

  const handleBackgroundClick = useCallback(() => {
    clearSelectedNodes()
    setNodeMenu(null)
    setBackgroundMenu(null)
  }, [clearSelectedNodes])

  const onNodeContextMenu = useCallback((node: any, event: MouseEvent) => {
    if (!containerRef.current || !node) return

    const pane = containerRef.current.getBoundingClientRect()
    const relativeX = event.clientX - pane.left
    const relativeY = event.clientY - pane.top

    // If multiple selected nodes → background menu
    if (selectedNodes.length > 0) {
      setBackgroundMenu({
        nodes: selectedNodes,
        rawTop: relativeY,
        rawLeft: relativeX,
        wrapperWidth: pane.width,
        wrapperHeight: pane.height,
        setMenu: setBackgroundMenu,
        onClick: handleBackgroundClick,
      })
      setNodeMenu(null)
      return
    }
    // Otherwise normal menu
    setNodeMenu({
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
      setMenu: setNodeMenu,
      onClick: handleBackgroundClick
    })
  }, [selectedNodes])


  const onBackgroundContextMenu = useCallback((event: MouseEvent) => {
    if (!containerRef.current) return
    const pane = containerRef.current.getBoundingClientRect()
    const relativeX = event.clientX - pane.left
    const relativeY = event.clientY - pane.top

    setBackgroundMenu({
      nodes: selectedNodes,
      rawTop: relativeY,
      rawLeft: relativeX,
      wrapperWidth: pane.width,
      wrapperHeight: pane.height,
      setMenu: setBackgroundMenu,
      onClick: handleBackgroundClick
    })
  }, [])

  const handleGraphRef = useCallback((ref: any) => {
    graphRef.current = ref
  }, [])
  return (
    <div ref={containerRef} className="relative h-full w-full bg-background">
      {/* <WebGLGraphViewer
        sketchId={sketchId as string}
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodeClick={handleNodeClick}
        onNodeRightClick={onNodeContextMenu}
        onBackgroundClick={handleBackgroundClick}
      /> */}
      <GraphViewer
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodeClick={handleNodeClick}
        onNodeRightClick={onNodeContextMenu}
        onBackgroundRightClick={onBackgroundContextMenu}
        onBackgroundClick={handleBackgroundClick}
        showLabels={true}
        showIcons={true}
        onGraphRef={handleGraphRef}
        allowLasso
        sketchId={sketchId}
      />
      {nodeMenu && selectedNodes.length === 0 && (
        <NodeContextMenu
          onClick={handleBackgroundClick}
          {...nodeMenu}
        />
      )}
      {(background || (nodeMenu && selectedNodes.length > 0)) && (
        <BackgroundContextMenu
          onClick={handleBackgroundClick}
          {...background}
        />
      )}

    </div>
  )
}

export default GraphMain
