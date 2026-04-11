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
import { usePermissions } from '@/hooks/use-can'

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
  onSubmitNew?: (edgeId: string, label: string) => void
  onDismissNew?: (edgeId: string) => void
}

type BackgroundContextMenuProps = BaseContextMenuProps & {
  nodes: GraphNode[]
  setMenu: Dispatch<SetStateAction<BackgroundContextMenuProps | null>>
}

const GraphMain = () => {
  const { id: sketchId } = useParams({ strict: false })
  const { canEdit, canCreate } = usePermissions()
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

  const lastBgClickRef = useRef(0)

  const handleBackgroundClick = useCallback(
    (event?: MouseEvent) => {
      // Double-click detection from consecutive onBackgroundClick calls
      const now = Date.now()
      if (event && now - lastBgClickRef.current < 400) {
        lastBgClickRef.current = 0
        if (canCreate && graphRef.current && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const sx = event.clientX - rect.left
          const sy = event.clientY - rect.top
          const gc = graphRef.current.screen2GraphCoords(sx, sy)
          openQuickAdd(sx, sy, gc.x, gc.y)
        }
        return
      }
      lastBgClickRef.current = now

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
    [openQuickAdd, linkCreation.mode, cancelLinkCreation, setCurrentNodeId, clearSelectedNodes, clearSelectedEdges, setCurrentEdgeId]
  )

  // Stable ref so ForceGraph2D always calls the latest version
  const bgClickRef = useRef(handleBackgroundClick)
  bgClickRef.current = handleBackgroundClick
  const stableBackgroundClick = useCallback((event?: MouseEvent) => {
    bgClickRef.current(event)
  }, [])

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
          onClick: stableBackgroundClick
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
        onClick: stableBackgroundClick
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
          onClick: stableBackgroundClick
        })
      } else {
        setEdgeMenu({
          edge,
          rawTop: relativeY,
          rawLeft: relativeX,
          wrapperWidth: pane.width,
          wrapperHeight: pane.height,
          setMenu: setEdgeMenu,
          onClick: stableBackgroundClick
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
      onClick: stableBackgroundClick
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
        onClick: stableBackgroundClick,
        onSubmitNew: submitNewEdge,
        onDismissNew: dismissNewEdge
      })
    },
    [completeLinking, handleBackgroundClick, submitNewEdge, dismissNewEdge]
  )

  const linkCreationProp = useMemo(
    () => canCreate ? ({
      shiftHeld,
      sourceNode: linkCreation.sourceNode,
      onStartLinking: startLinking,
      onCompleteLinking: handleCompleteLinking,
      onCancel: cancelLinkCreation
    }) : undefined,
    [canCreate, shiftHeld, linkCreation.sourceNode, startLinking, handleCompleteLinking, cancelLinkCreation]
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
        onBackgroundClick={stableBackgroundClick}
        showLabels={true}
        showIcons={true}
        onGraphRef={handleGraphRef}
        enableNodeDrag={canEdit && !shiftHeld}
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
