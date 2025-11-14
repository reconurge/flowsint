import { useGraphStore } from '@/stores/graph-store'
import React, { useRef, useCallback } from 'react'
// import GraphViewer from './graph-viewer'
// import WebGLGraphViewer from './webgl'
import ContextMenu from './context-menu'
import { useGraphControls } from '@/stores/graph-controls-store'
import GraphViewer from './graph-viewer'

const GraphMain = () => {
  const filteredNodes = useGraphStore((s) => s.filteredNodes)
  const filteredEdges = useGraphStore((s) => s.filteredEdges)
  const toggleNodeSelection = useGraphStore((s) => s.toggleNodeSelection)
  const clearSelectedNodes = useGraphStore((s) => s.clearSelectedNodes)
  const layoutMode = useGraphControls((s) => s.layoutMode)

  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = React.useState<any>(null)

  const handleNodeClick = useCallback(
    (node: any, event: MouseEvent) => {
      const isMultiSelect = event.ctrlKey || event.shiftKey
      toggleNodeSelection(node, isMultiSelect)
    },
    [toggleNodeSelection]
  )

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
      setMenu: setMenu
    })
  }, [])

  const handleGraphRef = useCallback((ref: any) => {
    graphRef.current = ref
  }, [])
  return (
    <div ref={containerRef} className="relative h-full w-full bg-background">
      {/* <WebGLGraphViewer
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodeClick={handleNodeClick}
        onNodeRightClick={onNodeContextMenu}
        onBackgroundClick={handleBackgroundClick}
        layoutMode={layoutMode}
      /> */}
      <GraphViewer
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodeClick={handleNodeClick}
        onNodeRightClick={onNodeContextMenu}
        onBackgroundClick={handleBackgroundClick}
        showLabels={true}
        showIcons={true}
        onGraphRef={handleGraphRef}
        allowLasso
        minimap={false}
      />

      {menu && <ContextMenu onClick={handleBackgroundClick} {...menu} />}
    </div>
  )
}

export default GraphMain
