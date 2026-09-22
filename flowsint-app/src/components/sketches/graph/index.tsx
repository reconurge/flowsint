import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import ForceGraph2D from 'react-force-graph-2d'
import { useGraphControls } from '@/stores/graph-controls-store'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { useGraphStore } from '@/stores/graph-store'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { useTheme } from '@/components/theme-provider'
import { useSaveNodePositions } from '@/hooks/use-save-node-positions'
import type { LinkObject } from 'react-force-graph-2d'
import type { GraphViewerRef, GraphNode, GraphEdge } from '@/types'
import { CONSTANTS } from './utils/constants'
import { GraphViewerProps } from './utils/types'
import {
  preloadImage,
  preloadIconByName,
  preloadExternalImage,
  preloadFlagImage
} from './utils/image-cache'
import { renderNode } from './node/node-renderer'
import { useKeyboardEvents } from './hooks/use-keyboard-events'
import { renderLink } from './edge/link-renderer'
import { createRenderContext, RenderContext } from './utils/render-context'
import { useHighlightState } from './hooks/use-highlight-state'
import { useComputedHighlights } from './hooks/use-computed-highlights'
import { useTooltip } from './hooks/use-tooltip'
import { transformGraphData } from './utils/graph-data-transformer'
import { useGraphLayout } from './hooks/use-graph-layout'
import { useGraphEvents } from './hooks/use-graph-events'
import { useGraphInitialization } from './hooks/use-graph-initialization'
import { GraphEmptyState } from './components/graph-empty-state'
import { GraphTooltip } from './components/graph-tooltip'
import { GraphLoadingOverlay } from './components/graph-loading-overlay'
import { GraphSelectorOverlay } from './components/graph-selector-overlay'
import { LinkCreationCanvas } from './components/link-creation-overlay'
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
  showMinimap,
  enableNodeDrag: enableNodeDragProp = true,
  linkCreation: linkCreationProp
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const graphRef = useRef<GraphViewerRef>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  // Notify parent when graphRef becomes available
  const graphReadyRef = useRef(false)
  useEffect(() => {
    if (graphRef.current && !graphReadyRef.current) {
      graphReadyRef.current = true
      onGraphRef?.(graphRef.current)
    }
  })

  const { saveAllNodePositions } = useSaveNodePositions(sketchId)

  const isSelectorModeActive = useGraphControls((s) => s.isSelectorModeActive)
  const selectionMode = useGraphControls((s) => s.selectionMode)
  const nodeColors = useNodesDisplaySettings((s) => s.colors)
  const customIcons = useNodesDisplaySettings((s) => s.customIcons)
  const setActions = useGraphControls((s) => s.setActions)
  const setCurrentLayoutType = useGraphControls((s) => s.setCurrentLayoutType)
  // getSettingValue returns number | boolean | undefined (generic getter
  // over any category/key pair) — this setting is always boolean-valued.
  const autoColorLinksByNodeType = useGraphSettingsStore((s) =>
    Boolean(s.getSettingValue('general', 'autoColorLinksByNodeType'))
  )
  // getSettingValue returns number | boolean | undefined (it's a generic
  // getter over any category/key pair) — this specific setting is always
  // boolean-valued, so coerce rather than widen the prop types below to
  // match the getter.
  const autoZoomOnCurrentNode = useGraphSettingsStore((s) =>
    Boolean(s.getSettingValue('general', 'autoZoomOnCurrentNode'))
  )
  const showBackgroundSetting = useGraphSettingsStore((s) =>
    Boolean(s.getSettingValue('general', 'showBackground'))
  )

  const showMinimapSetting = useGraphSettingsStore((s) =>
    Boolean(s.getSettingValue('general', 'showMinimap'))
  )
  const forceSettings = useGraphSettingsStore((s) => s.forceSettings)
  const setImportModalOpen = useGraphSettingsStore((s) => s.setImportModalOpen)

  const {
    currentNodeId,
    currentEdge,
    selectedNodes,
    selectedEdges,
    toggleEdgeSelection,
    setCurrentEdgeId,
    clearSelectedEdges,
    setOpenMainDialog,
    highlightedNodeIds
  } = useGraphStore(
    useShallow((s) => ({
      currentNodeId: s.currentNodeId,
      currentEdge: s.getCurrentEdge(),
      selectedNodes: s.selectedNodes,
      selectedEdges: s.selectedEdges,
      toggleEdgeSelection: s.toggleEdgeSelection,
      setCurrentEdgeId: s.setCurrentEdgeId,
      clearSelectedEdges: s.clearSelectedEdges,
      setOpenMainDialog: s.setOpenMainDialog,
      highlightedNodeIds: s.highlightedNodeIds
    }))
  )

  const { theme } = useTheme()

  const selectedNodeIds = useMemo(() => new Set(selectedNodes.map((n) => n.id)), [selectedNodes])

  const selectedNodeIdsRef = useRef(selectedNodeIds)
  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds
  }, [selectedNodeIds])

  const edgeMap = useMemo(() => new Map(edges.map((e) => [e.id, e])), [edges])

  const isCurrent = useCallback((nodeId: string) => nodeId === currentNodeId, [currentNodeId])

  const isSelected = useCallback((nodeId: string) => selectedNodeIds.has(nodeId), [selectedNodeIds])

  const graph2ScreenCoords = useCallback((node: GraphNode) => {
    if (!graphRef.current) return { x: 0, y: 0 }
    return graphRef.current.graph2ScreenCoords(node.x, node.y)
  }, [])

  // Preload icons and images
  useEffect(() => {
    if (!showIcons) return

    const isOutlined = forceSettings.nodeOutlined?.value ?? false
    const colors = isOutlined ? ['#FFFFFF', '#000000'] : ['#FFFFFF']

    // Collect unique values
    const nodeTypes = new Set<string>()
    const nodeIcons = new Set<string>()
    const nodeImages = new Set<string>()

    nodes.forEach((node) => {
      if (node.nodeImage) nodeImages.add(node.nodeImage)
      else if (node.nodeIcon) nodeIcons.add(node.nodeIcon)
      else if (node.nodeType) nodeTypes.add(node.nodeType)
    })

    // Preload external images
    nodeImages.forEach((url) => {
      preloadExternalImage(url).catch(console.warn)
    })

    // Preload custom icons by name
    nodeIcons.forEach((iconName) => {
      colors.forEach((color) => {
        preloadIconByName(iconName, color).catch(console.warn)
      })
    })

    // Preload type-based icons
    nodeTypes.forEach((type) => {
      colors.forEach((color) => {
        preloadImage(type, color).catch(console.warn)
      })
    })
  }, [nodes, showIcons, forceSettings.nodeOutlined?.value, customIcons])

  useEffect(() => {
    const flagColors = [
      { stroke: '#f87171', fill: '#fecaca' }, // red
      { stroke: '#fb923c', fill: '#fed7aa' }, // orange
      { stroke: '#60a5fa', fill: '#bfdbfe' }, // blue
      { stroke: '#4ade80', fill: '#bbf7d0' }, // green
      { stroke: '#facc15', fill: '#fef08a' } // yellow
    ]
    flagColors.forEach(({ stroke, fill }) => {
      preloadFlagImage(stroke, fill).catch((err) => {
        console.warn('[Graph] Failed to preload flag image:', stroke, fill, err)
      })
    })
  }, [])

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
    highlightNodes: hoverHighlightNodes,
    highlightLinks: hoverHighlightLinks,
    hoverNode,
    handleNodeHover,
    handleLinkHover,
    clearHighlights
  } = useHighlightState()

  // Current node persistent highlights (neighbors + connected edges)
  const currentNodeHighlights = useMemo(() => {
    const nodeSet = new Set<string>()
    const linkSet = new Set<string>()
    if (!currentNodeId) return { nodes: nodeSet, links: linkSet }

    nodeSet.add(currentNodeId)
    edges.forEach((edge) => {
      // GraphEdge.source/target are typed as plain id strings, but at
      // runtime this array can be the same reference react-force-graph
      // mutates source/target into node objects on (same duality as
      // GraphNode.links — see types/graph.ts).
      const sourceId =
        typeof edge.source === 'object' ? (edge.source as { id: string }).id : edge.source
      const targetId =
        typeof edge.target === 'object' ? (edge.target as { id: string }).id : edge.target
      if (sourceId === currentNodeId) {
        nodeSet.add(targetId)
        linkSet.add(`${sourceId}-${targetId}`)
      } else if (targetId === currentNodeId) {
        nodeSet.add(sourceId)
        linkSet.add(`${sourceId}-${targetId}`)
      }
    })
    return { nodes: nodeSet, links: linkSet }
  }, [currentNodeId, edges])

  // Path highlights from pathfinder
  const { highlightNodes: pathHighlightNodes, highlightLinks: pathHighlightLinks } =
    useComputedHighlights(highlightedNodeIds, edges)

  // Merge: hover is prioritary over persistent highlights
  const highlightNodes = useMemo(() => {
    if (hoverHighlightNodes.size > 0) return hoverHighlightNodes
    const merged = new Set<string>(currentNodeHighlights.nodes)
    pathHighlightNodes.forEach((id) => merged.add(id))
    return merged
  }, [hoverHighlightNodes, currentNodeHighlights.nodes, pathHighlightNodes])

  const highlightLinks = useMemo(() => {
    if (hoverHighlightLinks.size > 0) return hoverHighlightLinks
    const merged = new Set<string>(currentNodeHighlights.links)
    pathHighlightLinks.forEach((id) => merged.add(id))
    return merged
  }, [hoverHighlightLinks, currentNodeHighlights.links, pathHighlightLinks])

  const { tooltip, showTooltip, hideTooltip } = useTooltip(graphRef)

  const handleNodeHoverWithTooltip = useCallback(
    (node: GraphNode | null) => {
      if (node) {
        showTooltip(node)
      } else {
        hideTooltip()
      }
      handleNodeHover(node)
    },
    [handleNodeHover, showTooltip, hideTooltip]
  )

  useKeyboardEvents(sketchId)

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
    setCurrentEdgeId,
    clearSelectedEdges,
    saveAllNodePositions
  })

  const wrappedHandleNodeDragEnd = useCallback(
    (node: GraphNode) => {
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

  // reset hasPerformedInitialZoom on sketch change
  useEffect(() => {
    if (hasPerformedInitialZoom.current) hasPerformedInitialZoom.current = false
  }, [sketchId])

  const handleZoomToFitLocal = useCallback(() => {
    graphRef.current?.zoomToFit(400)
  }, [])

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

  const handleOpenNewAddItemDialog = useCallback(() => {
    setOpenMainDialog(true)
  }, [setOpenMainDialog])

  const handleOpenImportDialog = useCallback(() => {
    setImportModalOpen(true)
  }, [setImportModalOpen])

  // Render context: created once per frame, shared across all node/link render calls.
  // Invalidated when dependencies change or when the canvas transform changes between frames.
  const rcRef = useRef<{ rc: RenderContext | null; frameKey: string }>({
    rc: null,
    frameKey: ''
  })

  // Bumped whenever render context deps change, to force cache invalidation in
  // getOrCreateRC below even when globalScale alone doesn't. This used to be a
  // ref mutated straight in a useMemo body — invalid (refs can't be written
  // during render). Adjusted during render instead of via an effect: compare
  // against the previous deps tuple and bump synchronously when they differ,
  // same "one value per deps change" behavior, no extra render pass.
  const [rcDepsVersion, setRcDepsVersion] = useState(0)
  const [prevRcDeps, setPrevRcDeps] = useState([
    highlightNodes,
    highlightLinks,
    selectedEdges,
    theme
  ])
  if (
    highlightNodes !== prevRcDeps[0] ||
    highlightLinks !== prevRcDeps[1] ||
    selectedEdges !== prevRcDeps[2] ||
    theme !== prevRcDeps[3]
  ) {
    setPrevRcDeps([highlightNodes, highlightLinks, selectedEdges, theme])
    setRcDepsVersion((v) => v + 1)
  }

  const getOrCreateRC = useCallback(
    (globalScale: number): RenderContext => {
      const frameKey = `${globalScale}:${rcDepsVersion}`
      if (rcRef.current.frameKey !== frameKey || !rcRef.current.rc) {
        rcRef.current.rc = createRenderContext(
          globalScale,
          highlightNodes,
          highlightLinks,
          selectedEdges,
          theme
        )
        rcRef.current.frameKey = frameKey
      }
      return rcRef.current.rc
    },
    [highlightNodes, highlightLinks, selectedEdges, theme, rcDepsVersion]
  )

  const renderNodeCallback = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const rc = getOrCreateRC(globalScale)
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
        hoverNode,
        rc
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
      hoverNode,
      getOrCreateRC
    ]
  )

  const renderLinkCallback = useCallback(
    (
      // See link-renderer.ts's LinkRenderParams for why source/target are
      // omitted from the GraphEdge generic param here.
      link: LinkObject<GraphNode, Omit<GraphEdge, 'source' | 'target'>>,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => {
      const rc = getOrCreateRC(globalScale)
      // theme/highlightNodes/selectedEdges aren't passed here: renderLink
      // doesn't read them — theme and selection are already baked into `rc`
      // (rc.themeEdgeLabelBg, rc.selectedEdgeIds) by getOrCreateRC above.
      renderLink({
        link,
        ctx,
        globalScale,
        forceSettings,
        highlightLinks,
        currentEdge,
        autoColorLinksByNodeType,
        rc
      })
    },
    [forceSettings, highlightLinks, currentEdge, autoColorLinksByNodeType, getOrCreateRC]
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
      <ForceGraph2D<GraphNode, GraphEdge>
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
        dagLevelDistance={forceSettings.dagLevelDistance.value}
        backgroundColor={backgroundColor}
        linkCanvasObject={renderLinkCallback}
        enableNodeDrag={enableNodeDragProp}
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
      {linkCreationProp?.shiftHeld && (
        <LinkCreationCanvas
          nodes={graphData.nodes}
          graph2ScreenCoords={graph2ScreenCoords}
          width={containerSize.width}
          height={containerSize.height}
          onStartLinking={linkCreationProp.onStartLinking}
          onCompleteLinking={linkCreationProp.onCompleteLinking}
          onCancel={linkCreationProp.onCancel}
          sourceNode={linkCreationProp.sourceNode}
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
