import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { useGraphStore } from '@/stores/graph-store'
import { useGraphControls } from '@/stores/graph-controls-store'
import type { WebGLGraphViewerProps } from './types/graph.types'
import { usePixiApp } from './hooks/use-pixi-app'
import { useForceSimulation } from './hooks/use-force-simulation'
import { useGraphInteractions } from './hooks/use-graph-interactions'
import { useZoomPan } from './hooks/use-zoom-pan'
import { useGraphRenderer } from './hooks/use-graph-renderer'
import { GRAPH_CONSTANTS } from './constants'
// Uncomment to enable LOD debug indicator:
// import { LODIndicator } from './components/lod-indicator'

/**
 * WebGL Graph Viewer - High-performance graph visualization
 *
 * A clean, reusable, and performant graph viewer built with:
 * - Pixi.js (WebGL) for rendering
 * - D3-force for physics simulation
 * - Modular architecture with separation of concerns
 *
 * @example
 * ```tsx
 * <WebGLGraphViewer
 *   nodes={nodes}
 *   edges={edges}
 *   onNodeClick={(node) => console.log('Clicked:', node)}
 *   showIcons={true}
 *   showLabels={true}
 * />
 * ```
 */
const WebGLGraphViewer: React.FC<WebGLGraphViewerProps> = ({
  nodes,
  edges,
  className = '',
  style,
  onNodeClick,
  onNodeRightClick,
  onBackgroundClick,
  showIcons = true,
  showLabels = true,
  layoutMode = 'none',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  // Track zoom for LOD indicator (uncomment if using LODIndicator)
  // const [currentZoom, setCurrentZoom] = useState(1)

  // Store selectors
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const selectedNodeIds = useMemo(
    () => new Set(selectedNodes.map((n) => n.id)),
    [selectedNodes]
  )

  const nodeColors = useNodesDisplaySettings((s) => s.colors)
  const forceSettings = useGraphSettingsStore((s) => s.forceSettings)
  const { setActions } = useGraphControls()

  // Initialize Pixi.js app
  const { app, containers } = usePixiApp(containerElement)

  // Initialize force simulation
  const { simulationNodes, simulationLinks, simulation } = useForceSimulation({
    nodes,
    edges,
    width: dimensions.width,
    height: dimensions.height,
    nodeColors,
    layoutMode,
  })

  // Graph interactions (hover, click, drag)
  const {
    hoveredNodeId,
    highlightState,
    isDragging,
    handleNodeHover,
    handleNodeLeave,
    createNodePointerDownHandler,
    createNodeRightClickHandler,
    handleBackgroundClick,
    updateTransform,
  } = useGraphInteractions({
    simulation,
    onNodeClick,
    onNodeRightClick,
    onBackgroundClick,
  })

  // Handle background click on stage
  useEffect(() => {
    if (!app) return
    const stage = app.stage
    stage.on('click', handleBackgroundClick)
    return () => {
      stage.off('click', handleBackgroundClick)
    }
  }, [app, handleBackgroundClick])

  // Graph renderer
  const { handleZoomChange } = useGraphRenderer({
    app,
    containers,
    simulationNodes,
    simulationLinks,
    edges,
    selectedNodeIds,
    hoveredNodeId,
    highlightState,
    forceSettings,
    showIcons,
    showLabels,
    onNodeHover: handleNodeHover,
    onNodeLeave: handleNodeLeave,
    createNodePointerDownHandler,
    createNodeRightClickHandler,
  })

  // Zoom and pan controls
  const { zoomIn, zoomOut, zoomToFit } = useZoomPan({
    app,
    stage: app?.stage ?? null,
    width: dimensions.width,
    height: dimensions.height,
    isDragging,
    simulationNodes,
    onTransformChange: updateTransform,
    onZoomChange: (zoom) => {
      handleZoomChange(zoom)
      // Uncomment if using LODIndicator:
      // setCurrentZoom(zoom)
    },
  })

  // Expose zoom controls to global store
  useEffect(() => {
    setActions({ zoomIn, zoomOut, zoomToFit })
    return () => {
      setActions({
        zoomIn: () => {},
        zoomOut: () => {},
        zoomToFit: () => {},
      })
    }
  }, [zoomIn, zoomOut, zoomToFit, setActions])

  // Container ref callback with resize observer
  const containerCallback = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element
    setContainerElement(element)

    // Cleanup previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
      resizeObserverRef.current = null
    }

    if (!element) return

    // Update initial dimensions
    const rect = element.getBoundingClientRect()
    setDimensions({ width: rect.width, height: rect.height })

    // Setup resize observer with debounce
    let resizeTimeout: NodeJS.Timeout | null = null
    const handleResize = (entries: ResizeObserverEntry[]) => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const entry = entries[0]
        if (entry) {
          const { width, height } = entry.contentRect
          setDimensions({ width, height })
        }
      }, GRAPH_CONSTANTS.RESIZE_DEBOUNCE_MS)
    }

    resizeObserverRef.current = new ResizeObserver(handleResize)
    resizeObserverRef.current.observe(element)
  }, [])

  // Cleanup resize observer on unmount
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
    }
  }, [])

  // Empty state
  if (!nodes.length) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center ${className}`}
        style={style}
      >
        <div className="text-center text-muted-foreground">
          <p>No data to visualize</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerCallback}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        ...style,
      }}
    >
      {/* Uncomment to show LOD indicator for debugging:
      <LODIndicator zoomLevel={currentZoom} visible={process.env.NODE_ENV === 'development'} />
      */}
    </div>
  )
}

export default WebGLGraphViewer
