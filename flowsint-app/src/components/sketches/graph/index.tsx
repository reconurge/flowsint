import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import ForceGraph2D from 'react-force-graph-2d'
import { useGraphControls } from '@/stores/graph-controls-store'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { useGraphStore } from '@/stores/graph-store'
import { ItemType, useNodesDisplaySettings } from '@/stores/node-display-settings'
import { useTheme } from '@/components/theme-provider'
import { useSaveNodePositions } from '@/hooks/use-save-node-positions'
import { CONSTANTS } from './constants'
import { GraphViewerProps } from './types'
import { preloadImage } from './image-cache'
import { renderNode } from './node-renderer'
import { renderLink } from './link-renderer'
import { useHighlightState } from './use-highlight-state'
import { useTooltip } from './use-tooltip'
import { transformGraphData } from './graph-data-transformer'
import { useGraphLayout } from './use-graph-layout'
import { useGraphEvents } from './use-graph-events'
import { useGraphInitialization } from './use-graph-initialization'
import { GraphEmptyState } from './graph-empty-state'
import { GraphTooltip } from './graph-tooltip'
import { GraphLoadingOverlay } from './graph-loading-overlay'
import { GraphSelectorOverlay } from './graph-selector-overlay'

const GraphViewer: React.FC<GraphViewerProps> = ({
  nodes,
  edges,
  onNodeClick,
  onNodeRightClick,
  onEdgeRightClick,
  onBackgroundClick,
  onBackgroundRightClick,
  showLabels = true,
  showIcons = true,
  backgroundColor = 'transparent',
  className = '',
  style,
  onGraphRef,
  instanceId,
  allowLasso = false,
  sketchId,
  allowForces = false,
  autoZoomOnNode = true
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { saveAllNodePositions } = useSaveNodePositions(sketchId)

  const isSelectorModeActive = useGraphControls((s) => s.isSelectorModeActive)
  const selectionMode = useGraphControls((s) => s.selectionMode)
  const nodeColors = useNodesDisplaySettings((s) => s.colors)
  const setActions = useGraphControls((s) => s.setActions)
  const setCurrentLayoutType = useGraphControls((s) => s.setCurrentLayoutType)
  const shouldRegenerateLayoutOnNextRefetch = useGraphControls((s) => s.shouldRegenerateLayoutOnNextRefetch)
  const setShouldRegenerateLayoutOnNextRefetch = useGraphControls((s) => s.setShouldRegenerateLayoutOnNextRefetch)
  const currentLayoutType = useGraphControls((s) => s.currentLayoutType)
  const autoZoomOnCurrentNode = useGraphSettingsStore((s) => s.getSettingValue('general', 'autoZoomOnCurrentNode'))
  const forceSettings = useGraphSettingsStore((s) => s.forceSettings)
  const setImportModalOpen = useGraphSettingsStore((s) => s.setImportModalOpen)

  const { currentNode, currentEdge, selectedNodes, selectedEdges, toggleEdgeSelection, setCurrentEdge, clearSelectedEdges, setOpenMainDialog } = useGraphStore(
    useShallow((s) => ({
      currentNode: s.currentNode,
      currentEdge: s.currentEdge,
      selectedNodes: s.selectedNodes,
      selectedEdges: s.selectedEdges,
      toggleEdgeSelection: s.toggleEdgeSelection,
      setCurrentEdge: s.setCurrentEdge,
      clearSelectedEdges: s.clearSelectedEdges,
      setOpenMainDialog: s.setOpenMainDialog
    }))
  )

  const { theme } = useTheme()

  const selectedNodeIds = useMemo(
    () => new Set(selectedNodes.map(n => n.id)),
    [selectedNodes]
  )
  const currentNodeId = currentNode?.id

  const selectedNodeIdsRef = useRef(selectedNodeIds)
  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds
  }, [selectedNodeIds])

  const edgeMap = useMemo(
    () => new Map(edges.map(e => [e.id, e])),
    [edges]
  )

  const isCurrent = useCallback(
    (nodeId: string) => nodeId === currentNodeId,
    [currentNodeId]
  )

  const isSelected = useCallback(
    (nodeId: string) => selectedNodeIds.has(nodeId),
    [selectedNodeIds]
  )

  const graph2ScreenCoords = useCallback(
    (node: any) => {
      if (!graphRef.current) return { x: 0, y: 0 }
      return graphRef.current.graph2ScreenCoords(node.x, node.y)
    },
    []
  )

  // Preload icons
  useEffect(() => {
    if (showIcons) {
      const iconTypes = new Set(nodes.map((node) => node.data?.type as ItemType).filter(Boolean))
      iconTypes.forEach((type) => {
        preloadImage(type).catch(console.warn)
      })
    }
  }, [nodes, showIcons])

  // Container size management
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({
          width: rect.width,
          height: rect.height
        })
      }
    }

    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    window.addEventListener('resize', updateSize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  const graphData = useMemo(() => {
    return transformGraphData({ nodes, edges, nodeColors })
  }, [nodes, edges, nodeColors])

  const { isRegeneratingLayout, regenerateLayout } = useGraphLayout({
    forceSettings,
    containerSize,
    saveAllNodePositions,
    graphRef,
    graphData
  })

  const wrappedRegenerateLayout = useCallback((layoutType: 'force' | 'hierarchy') => {
    setCurrentLayoutType(layoutType)
    regenerateLayout(layoutType)
  }, [regenerateLayout, setCurrentLayoutType])

  const { highlightNodes, highlightLinks, hoverNode, handleNodeHover, handleLinkHover, clearHighlights } = useHighlightState()

  const { tooltip, showTooltip, hideTooltip } = useTooltip(graphRef)

  const handleNodeHoverWithTooltip = useCallback(
    (node: any) => {
      if (node) {
        showTooltip(node)
      } else {
        hideTooltip()
      }
      handleNodeHover(node)
    },
    [handleNodeHover, showTooltip, hideTooltip]
  )

  const {
    handleNodeClick,
    handleNodeRightClick,
    handleEdgeRightClick,
    handleEdgeClick,
    handleBackgroundClick,
    handleBackgroundRightClick,
    handleNodeDragEnd
  } = useGraphEvents({
    onNodeClick,
    onNodeRightClick,
    onEdgeRightClick,
    onBackgroundClick,
    onBackgroundRightClick,
    autoZoomOnCurrentNode,
    autoZoomOnNode,
    graphRef,
    edgeMap,
    toggleEdgeSelection,
    setCurrentEdge,
    clearSelectedEdges,
    saveAllNodePositions
  })

  const wrappedHandleNodeDragEnd = useCallback((node: any) => {
    handleNodeDragEnd(node, graphData)
  }, [handleNodeDragEnd, graphData])

  useGraphInitialization({
    graphRef,
    instanceId,
    setActions,
    onGraphRef,
    selectedNodeIdsRef,
    regenerateLayout: wrappedRegenerateLayout
  })

  // Clear highlights when graph data changes
  useEffect(() => {
    clearHighlights()
  }, [nodes, edges, clearHighlights])

  // Auto-regenerate layout when data is refetched (if flag is set)
  useEffect(() => {
    if (shouldRegenerateLayoutOnNextRefetch && currentLayoutType && graphData.nodes.length > 0) {
      setShouldRegenerateLayoutOnNextRefetch(false)
      regenerateLayout(currentLayoutType)
    }
  }, [graphData.nodes.length, shouldRegenerateLayoutOnNextRefetch, currentLayoutType, regenerateLayout, setShouldRegenerateLayoutOnNextRefetch])

  const handleOpenNewAddItemDialog = useCallback(() => {
    setOpenMainDialog(true)
  }, [setOpenMainDialog])

  const handleOpenImportDialog = useCallback(() => {
    setImportModalOpen(true)
  }, [setImportModalOpen])

  const renderNodeCallback = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      renderNode({
        node,
        ctx,
        globalScale,
        forceSettings,
        showLabels,
        showIcons,
        isCurrent,
        isSelected,
        theme,
        highlightNodes,
        highlightLinks,
        hoverNode
      })
    },
    [forceSettings, showLabels, showIcons, isCurrent, isSelected, theme, highlightNodes, highlightLinks, hoverNode]
  )

  const renderLinkCallback = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      renderLink({
        link,
        ctx,
        globalScale,
        forceSettings,
        theme,
        highlightLinks,
        highlightNodes,
        selectedEdges,
        currentEdge
      })
    },
    [forceSettings, theme, highlightLinks, highlightNodes, selectedEdges, currentEdge]
  )

  if (!nodes.length) {
    return (
      <div ref={containerRef} className={"h-full"} style={style}>
        <GraphEmptyState
          onOpenAddDialog={handleOpenNewAddItemDialog}
          onOpenImportDialog={handleOpenImportDialog}
          className={className}
          style={style}
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={className}
      data-graph-container
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        minWidth: '100%',
        position: 'relative',
        ...style
      }}
    >
      <GraphTooltip tooltip={tooltip} />
      <ForceGraph2D
        ref={graphRef}
        width={containerSize.width}
        height={containerSize.height}
        graphData={graphData}
        maxZoom={CONSTANTS.MAX_ZOOM}
        minZoom={CONSTANTS.MIN_ZOOM}
        nodeLabel={() => ''}
        nodeRelSize={3}
        onNodeRightClick={handleNodeRightClick}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        onBackgroundRightClick={handleBackgroundRightClick}
        onLinkClick={handleEdgeClick}
        onLinkRightClick={handleEdgeRightClick}
        linkCurvature={(link) => link.curvature || 0}
        nodeCanvasObject={renderNodeCallback}
        onNodeDragEnd={wrappedHandleNodeDragEnd}
        cooldownTicks={allowForces ? forceSettings.cooldownTicks.value : 0}
        cooldownTime={forceSettings.cooldownTime.value}
        d3AlphaDecay={forceSettings.d3AlphaDecay.value}
        d3AlphaMin={forceSettings.d3AlphaMin.value}
        d3VelocityDecay={forceSettings.d3VelocityDecay.value}
        warmupTicks={forceSettings?.warmupTicks?.value ?? 0}
        dagLevelDistance={forceSettings.dagLevelDistance.value}
        backgroundColor={backgroundColor}
        linkCanvasObject={renderLinkCallback}
        enableNodeDrag={true}
        autoPauseRedraw={true}
        onNodeHover={handleNodeHoverWithTooltip}
        onLinkHover={handleLinkHover}
      />
      {allowLasso && (
        <GraphSelectorOverlay
          isActive={isSelectorModeActive}
          selectionMode={selectionMode}
          nodes={graphData.nodes}
          graph2ScreenCoords={graph2ScreenCoords}
          containerSize={containerSize}
        />
      )}
      <GraphLoadingOverlay isVisible={isRegeneratingLayout} />
    </div>
  )
}

export default GraphViewer
export { GRAPH_COLORS } from './constants'
