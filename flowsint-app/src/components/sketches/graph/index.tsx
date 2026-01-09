import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import ForceGraph2D from 'react-force-graph-2d'
import { useGraphControls } from '@/stores/graph-controls-store'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { useGraphStore } from '@/stores/graph-store'
import { ItemType, useNodesDisplaySettings } from '@/stores/node-display-settings'
import { useTheme } from '@/components/theme-provider'
import { useSaveNodePositions } from '@/hooks/use-save-node-positions'
import { CONSTANTS } from './utils/constants'
import { GraphViewerProps } from './utils/types'
import { preloadImage } from './utils/image-cache'
import { renderNode } from './node/node-renderer'
import { renderLink } from './edge/link-renderer'
import { useHighlightState } from './hooks/use-highlight-state'
import { useTooltip } from './hooks/use-tooltip'
import { transformGraphData } from './utils/graph-data-transformer'
import { useGraphLayout } from './hooks/use-graph-layout'
import { useGraphEvents } from './hooks/use-graph-events'
import { useGraphInitialization } from './hooks/use-graph-initialization'
import { GraphEmptyState } from './components/graph-empty-state'
import { GraphTooltip } from './components/graph-tooltip'
import { GraphLoadingOverlay } from './components/graph-loading-overlay'
import { GraphSelectorOverlay } from './components/graph-selector-overlay'
import MinimapCanvas from './components/minimap'
import { Background } from './background'
import { BackgroundVariant } from './background/background-types'
import { Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  autoZoomOnNode = true,
  showMinimalControls = false,
  showMinimap
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { saveAllNodePositions } = useSaveNodePositions(sketchId)

  const isSelectorModeActive = useGraphControls((s) => s.isSelectorModeActive)
  const selectionMode = useGraphControls((s) => s.selectionMode)
  const nodeColors = useNodesDisplaySettings((s) => s.colors)
  const customIcons = useNodesDisplaySettings((s) => s.customIcons)
  const setActions = useGraphControls((s) => s.setActions)
  const setCurrentLayoutType = useGraphControls((s) => s.setCurrentLayoutType)
  const autoColorLinksByNodeType = useGraphSettingsStore((s) =>
    s.getSettingValue('general', 'autoColorLinksByNodeType')
  )
  const autoZoomOnCurrentNode = useGraphSettingsStore((s) =>
    s.getSettingValue('general', 'autoZoomOnCurrentNode')
  )
  const showBackgroundSetting = useGraphSettingsStore((s) =>
    s.getSettingValue('general', 'showBackground')
  )

  const showMinimapSetting = useGraphSettingsStore((s) =>
    s.getSettingValue('general', 'showMinimap')
  )
  const forceSettings = useGraphSettingsStore((s) => s.forceSettings)
  const setImportModalOpen = useGraphSettingsStore((s) => s.setImportModalOpen)

  const {
    currentNode,
    currentEdge,
    selectedNodes,
    selectedEdges,
    toggleEdgeSelection,
    setCurrentEdge,
    clearSelectedEdges,
    setOpenMainDialog
  } = useGraphStore(
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

  const selectedNodeIds = useMemo(() => new Set(selectedNodes.map((n) => n.id)), [selectedNodes])
  const currentNodeId = currentNode?.id

  const selectedNodeIdsRef = useRef(selectedNodeIds)
  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds
  }, [selectedNodeIds])

  const edgeMap = useMemo(() => new Map(edges.map((e) => [e.id, e])), [edges])

  const isCurrent = useCallback((nodeId: string) => nodeId === currentNodeId, [currentNodeId])

  const isSelected = useCallback((nodeId: string) => selectedNodeIds.has(nodeId), [selectedNodeIds])

  const graph2ScreenCoords = useCallback((node: any) => {
    if (!graphRef.current) return { x: 0, y: 0 }
    return graphRef.current.graph2ScreenCoords(node.x, node.y)
  }, [])

  // Preload icons
  useEffect(() => {
    if (showIcons) {
      const isOutlined = forceSettings.nodeOutlined?.value ?? false
      const iconTypes = new Set(nodes.map((node) => node.data?.type as ItemType).filter(Boolean))

      if (isOutlined) {
        // In outlined mode, preload icons in both white and black
        iconTypes.forEach((type) => {
          preloadImage(type, '#FFFFFF').catch(console.warn) // for dark theme
          preloadImage(type, '#000000').catch(console.warn) // for light theme
        })
      } else {
        // In filled mode, preload icons with white color only
        iconTypes.forEach((type) => {
          preloadImage(type, '#FFFFFF').catch(console.warn)
        })
      }
    }
  }, [nodes, showIcons, forceSettings.nodeOutlined?.value, customIcons])

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

  const wrappedRegenerateLayout = useCallback(
    (layoutType: 'force' | 'hierarchy') => {
      setCurrentLayoutType(layoutType)
      regenerateLayout(layoutType)
    },
    [regenerateLayout, setCurrentLayoutType]
  )

  const {
    highlightNodes,
    highlightLinks,
    hoverNode,
    handleNodeHover,
    handleLinkHover,
    clearHighlights
  } = useHighlightState()

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

  const wrappedHandleNodeDragEnd = useCallback(
    (node: any) => {
      handleNodeDragEnd(node, graphData)
    },
    [handleNodeDragEnd, graphData]
  )

  const hasPerformedInitialZoom = useRef(false)

  const handleEngineStop = useCallback(() => {
    // Perform initial zoom to fit only once when graph is first rendered
    if (!hasPerformedInitialZoom.current && graphRef.current) {
      hasPerformedInitialZoom.current = true
      if (typeof graphRef.current.zoomToFit === 'function') {
        graphRef.current.zoomToFit(400)
      }
    }
  }, [])

  const handleZoomToFitLocal = useCallback(() => {
    if (typeof graphRef.current.zoomToFit === 'function') {
      graphRef.current.zoomToFit(400)
    }
  }, [])

  const exportToPNG = useCallback(async () => {
    if (!graphRef.current) {
      throw new Error('Graph ref not available')
    }
    // Get the canvas element from the ForceGraph2D component
    const canvas = containerRef.current?.querySelector('canvas')
    if (!canvas) {
      throw new Error('Canvas element not found')
    }
    return new Promise<void>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'))
          return
        }
        // Create download link
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sketch-${sketchId || 'export'}-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        // Cleanup
        URL.revokeObjectURL(url)
        document.body.removeChild(a)
        resolve()
      }, 'image/png')
    })
  }, [sketchId])

  useGraphInitialization({
    graphRef,
    instanceId,
    setActions,
    onGraphRef,
    selectedNodeIdsRef,
    regenerateLayout: wrappedRegenerateLayout
  })

  // Expose export function to global store
  useEffect(() => {
    setActions({ exportToPNG })
    return () => {
      setActions({ exportToPNG: async () => {} })
    }
  }, [exportToPNG, setActions])

  // Clear highlights when graph data changes
  useEffect(() => {
    clearHighlights()
  }, [nodes, edges, clearHighlights])

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
    [
      forceSettings,
      showLabels,
      showIcons,
      isCurrent,
      isSelected,
      theme,
      highlightNodes,
      highlightLinks,
      hoverNode
    ]
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
        currentEdge,
        autoColorLinksByNodeType
      })
    },
    [forceSettings, theme, highlightLinks, highlightNodes, selectedEdges, currentEdge, autoColorLinksByNodeType]
  )

  if (!nodes.length) {
    return (
      <div ref={containerRef} className={'h-full'} style={style}>
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
      {showBackgroundSetting && containerSize.width > 0 && containerSize.height > 0 && (
        <Background
          key={`background-${instanceId || 'main'}`}
          id={instanceId || 'main'}
          variant={BackgroundVariant.Dots}
          gap={4}
          size={0.25}
          color="rgba(128, 128, 128, 0.47)"
          bgColor="transparent"
          graphRef={graphRef}
          canvasWidth={containerSize.width}
          canvasHeight={containerSize.height}
        />
      )}
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
        onEngineStop={handleEngineStop}
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
      {(showMinimap ?? showMinimapSetting) && graphData.nodes.length > 0 && (
        <MinimapCanvas
          nodes={graphData.nodes}
          graphRef={graphRef}
          canvasWidth={containerSize.width}
          canvasHeight={containerSize.height}
        />
      )}
      {showMinimalControls && (
        <div className="absolute top-1 right-1">
          <Button
            onClick={handleZoomToFitLocal}
            variant={'ghost'}
            size={'icon'}
            className="h-6 w-6"
          >
            <Maximize className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </div>
      )}
      ·
      <GraphLoadingOverlay isVisible={isRegeneratingLayout} />
    </div>
  )
}

export default GraphViewer
export { GRAPH_COLORS } from './utils/constants'
export { default as GraphMain } from './components/graph-main'
