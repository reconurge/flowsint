import { useGraphStore } from '@/stores/graph-store'
import React, { useRef, useCallback, useMemo, SetStateAction, Dispatch } from 'react'
import GraphViewer from '../index'
import NodeContextMenu from '../context-menu/node-context-menu'
import BackgroundContextMenu from '../context-menu/background-context-menu'
import EdgeContextMenu from '../context-menu/edge-context-menu'
import { PathPanel } from '../actions/path-finder'
import { useParams } from '@tanstack/react-router'
import { type GraphNode, GraphEdge } from '@/types'
import { useLinkCreation } from '../hooks/use-link-creation'
import { useQuickAdd } from '../hooks/use-quick-add'
import { QuickAddOverlay } from './quick-add-overlay'

type BaseContextMenuProps = {
  rawTop: number
  rawLeft: number
  wrapperWidth: number
  wrapperHeight: number
  onClick: () => void
}

type NodeContextMenuProps = BaseContextMenuProps & {
  node: GraphNode
  setMenu: Dispatch<SetStateAction<NodeContextMenuProps | null>>
}

type EdgeContextMenuProps = BaseContextMenuProps & {
  edge?: GraphEdge
  edges?: GraphEdge[]
  setMenu: Dispatch<SetStateAction<EdgeContextMenuProps | null>>
}

type BackgroundContextMenuProps = BaseContextMenuProps & {
  nodes: GraphNode[]
  setMenu: Dispatch<SetStateAction<BackgroundContextMenuProps | null>>
}

const GraphMain = () => {
  const { id: sketchId } = useParams({ strict: false })
  const filteredNodes = useGraphStore((s) => s.filteredNodes)
  const filteredEdges = useGraphStore((s) => s.filteredEdges)
  const toggleNodeSelection = useGraphStore((s) => s.toggleNodeSelection)
  const setCurrentNodeId = useGraphStore((s) => s.setCurrentNodeId)
  const clearSelectedNodes = useGraphStore((s) => s.clearSelectedNodes)
  const clearSelectedEdges = useGraphStore((s) => s.clearSelectedEdges)
  const setCurrentEdgeId = useGraphStore((s) => s.setCurrentEdgeId)
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const selectedEdges = useGraphStore((s) => s.selectedEdges)

  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodeMenu, setNodeMenu] = React.useState<NodeContextMenuProps | null>(null)
  const [edgeMenu, setEdgeMenu] = React.useState<EdgeContextMenuProps | null>(null)
  const [background, setBackgroundMenu] = React.useState<BackgroundContextMenuProps | null>(null)

  const {
    linkCreation,
    shiftHeld,
    startLinking,
    completeLinking,
    cancelLinkCreation,
    submitNewEdge,
    dismissNewEdge
  } = useLinkCreation(sketchId)

  const { quickAdd, openQuickAdd, closeQuickAdd, setQuickAddText, submitQuickAdd } =
    useQuickAdd(sketchId)

  const handleNodeClick = useCallback(
    (node: any, event: MouseEvent) => {
      const isMultiSelect = event.ctrlKey || event.shiftKey
      if (isMultiSelect) {
        toggleNodeSelection(node, true)
      } else {
        setCurrentNodeId(node.id)
        clearSelectedNodes()
      }
    },
    [toggleNodeSelection, setCurrentNodeId, clearSelectedNodes]
  )

  const lastClickRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 })

  const handleBackgroundClick = useCallback(
    (event?: MouseEvent) => {
      if (quickAdd.active) {
        closeQuickAdd()
        return
      }

      // Double-click detection from background clicks
      if (event && graphRef.current && containerRef.current) {
        const now = Date.now()
        const last = lastClickRef.current
        const dx = event.clientX - last.x
        const dy = event.clientY - last.y
        const timeDiff = now - last.time
        const dist = Math.sqrt(dx * dx + dy * dy)

        lastClickRef.current = { time: now, x: event.clientX, y: event.clientY }

        if (timeDiff < 400 && dist < 10) {
          // Double click detected
          const rect = containerRef.current.getBoundingClientRect()
          const screenX = event.clientX - rect.left
          const screenY = event.clientY - rect.top
          const graphCoords = graphRef.current.screen2GraphCoords(screenX, screenY)
          openQuickAdd(screenX, screenY, graphCoords.x, graphCoords.y)
          return
        }
      }

      if (linkCreation.mode !== 'idle') {
        cancelLinkCreation()
        return
      }
      setCurrentNodeId(null)
      clearSelectedNodes()
      clearSelectedEdges()
      setCurrentEdgeId(null)
      setNodeMenu(null)
      setEdgeMenu(null)
      setBackgroundMenu(null)
    },
    [
      quickAdd.active,
      closeQuickAdd,
      openQuickAdd,
      linkCreation.mode,
      cancelLinkCreation,
      setCurrentNodeId,
      clearSelectedNodes,
      clearSelectedEdges,
      setCurrentEdgeId
    ]
  )

  const onNodeContextMenu = useCallback(
    (node: any, event: MouseEvent) => {
      if (!containerRef.current || !node) return

      const pane = containerRef.current.getBoundingClientRect()
      const relativeX = event.clientX - pane.left
      const relativeY = event.clientY - pane.top

      if (selectedNodes.length > 0) {
        setBackgroundMenu({
          nodes: selectedNodes,
          rawTop: relativeY,
          rawLeft: relativeX,
          wrapperWidth: pane.width,
          wrapperHeight: pane.height,
          setMenu: setBackgroundMenu,
          onClick: handleBackgroundClick
        })
        setNodeMenu(null)
        return
      }
      setNodeMenu({
        node,
        rawTop: relativeY,
        rawLeft: relativeX,
        wrapperWidth: pane.width,
        wrapperHeight: pane.height,
        setMenu: setNodeMenu,
        onClick: handleBackgroundClick
      })
    },
    [selectedNodes]
  )

  const onEdgeContextMenu = useCallback(
    (edge: any, event: MouseEvent) => {
      if (!containerRef.current || !edge) return

      const pane = containerRef.current.getBoundingClientRect()
      const relativeX = event.clientX - pane.left
      const relativeY = event.clientY - pane.top

      if (selectedEdges.length > 0) {
        setEdgeMenu({
          edges: selectedEdges,
          rawTop: relativeY,
          rawLeft: relativeX,
          wrapperWidth: pane.width,
          wrapperHeight: pane.height,
          setMenu: setEdgeMenu,
          onClick: handleBackgroundClick
        })
      } else {
        setEdgeMenu({
          edge,
          rawTop: relativeY,
          rawLeft: relativeX,
          wrapperWidth: pane.width,
          wrapperHeight: pane.height,
          setMenu: setEdgeMenu,
          onClick: handleBackgroundClick
        })
      }
      setNodeMenu(null)
      setBackgroundMenu(null)
    },
    [selectedEdges, handleBackgroundClick]
  )

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

  // On link creation complete: create edge in store, then open edge context menu
  const handleCompleteLinking = useCallback(
    (targetNode: GraphNode, screenX: number, screenY: number) => {
      const newEdge = completeLinking(targetNode)
      if (!newEdge || !containerRef.current) return

      const pane = containerRef.current.getBoundingClientRect()

      setEdgeMenu({
        edge: newEdge,
        rawTop: screenY,
        rawLeft: screenX,
        wrapperWidth: pane.width,
        wrapperHeight: pane.height,
        setMenu: setEdgeMenu,
        onClick: handleBackgroundClick,
        onSubmitNew: submitNewEdge,
        onDismissNew: dismissNewEdge
      })
    },
    [completeLinking, handleBackgroundClick, submitNewEdge, dismissNewEdge]
  )

  const linkCreationProp = useMemo(
    () => ({
      shiftHeld,
      sourceNode: linkCreation.sourceNode,
      onStartLinking: startLinking,
      onCompleteLinking: handleCompleteLinking,
      onCancel: cancelLinkCreation
    }),
    [shiftHeld, linkCreation.sourceNode, startLinking, handleCompleteLinking, cancelLinkCreation]
  )

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
        onEdgeRightClick={onEdgeContextMenu}
        onBackgroundRightClick={onBackgroundContextMenu}
        onBackgroundClick={handleBackgroundClick}
        showLabels={true}
        showIcons={true}
        onGraphRef={handleGraphRef}
        enableNodeDrag={!shiftHeld}
        allowLasso
        sketchId={sketchId}
        linkCreation={linkCreationProp}
      />
      <QuickAddOverlay
        active={quickAdd.active}
        position={quickAdd.position}
        text={quickAdd.text}
        detection={quickAdd.detection}
        loading={quickAdd.loading}
        onTextChange={setQuickAddText}
        onSubmit={submitQuickAdd}
        onCancel={closeQuickAdd}
      />
      <PathPanel />
      {nodeMenu && selectedNodes.length === 0 && <NodeContextMenu {...nodeMenu} />}
      {edgeMenu && <EdgeContextMenu {...edgeMenu} />}
      {(background || (nodeMenu && selectedNodes.length > 0)) && (
        <BackgroundContextMenu {...background} />
      )}
    </div>
  )
}

export default GraphMain
