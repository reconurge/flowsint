import { useGraphStore } from '@/stores/graph-store'
import React, { useRef, useCallback } from 'react'
import GraphViewer from './graph-viewer'
import ContextMenu from './context-menu'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'

const GraphMain = () => {
  const filteredNodes = useGraphStore((s) => s.filteredNodes)
  const filteredEdges = useGraphStore((s) => s.filteredEdges)
  const toggleNodeSelection = useGraphStore((s) => s.toggleNodeSelection)
  const clearSelectedNodes = useGraphStore((s) => s.clearSelectedNodes)
  const settings = useGraphSettingsStore((s) => s.settings)

  const graphRef = useRef<any>()
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
