import { useGraphControls } from '@/stores/graph-controls-store'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { useGraphStore } from '@/stores/graph-store'
import { ItemType, useNodesDisplaySettings } from '@/stores/node-display-settings'
import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import ForceGraph2D from 'react-force-graph-2d'
import { Button } from '../ui/button'
import { useTheme } from '@/components/theme-provider'
import { Info, Loader2, Plus, Share2, Type, Upload } from 'lucide-react'
import Lasso from './selectors/lasso'
import Rectangle from './selectors/rectangle'
import { GraphNode, GraphEdge } from '@/types'
import { useSaveNodePositions } from '@/hooks/use-save-node-positions'
import { useLayout } from '@/hooks/use-layout'

function truncateText(text: string, limit: number = 16) {
  if (text.length <= limit) return text
  return text.substring(0, limit) + '...'
}

interface GraphViewerProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (node: GraphNode, event: MouseEvent) => void
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void
  onEdgeRightClick?: (edge: GraphEdge, event: MouseEvent) => void
  onBackgroundClick?: () => void
  onBackgroundRightClick?: (event: MouseEvent) => void
  showLabels?: boolean
  showIcons?: boolean
  backgroundColor?: string
  className?: string
  style?: React.CSSProperties
  onGraphRef?: (ref: any) => void
  instanceId?: string // Add instanceId prop for instance-specific actions
  allowLasso?: boolean
  sketchId?: string // Add sketchId for saving node positions
  allowForces?: boolean
}

// Graph viewer specific colors
export const GRAPH_COLORS = {
  // Link colors
  LINK_DEFAULT: 'rgba(128, 128, 128, 0.6)',
  LINK_HIGHLIGHTED: 'rgba(255, 115, 0, 0.68)',
  LINK_DIMMED: 'rgba(133, 133, 133, 0.23)',
  LINK_LABEL_HIGHLIGHTED: 'rgba(255, 115, 0, 0.9)',
  LINK_LABEL_DEFAULT: 'rgba(180, 180, 180, 0.75)',
  // Node highlight colors
  NODE_HIGHLIGHT_HOVER: 'rgba(255, 0, 0, 0.3)',
  NODE_HIGHLIGHT_DEFAULT: 'rgba(255, 165, 0, 0.3)',
  LASSO_FILL: 'rgba(255, 115, 0, 0.07)',
  LASSO_STROKE: 'rgba(255, 115, 0, 0.56)',
  // Text colors
  TEXT_LIGHT: '#161616',
  TEXT_DARK: '#FFFFFF',
  // Background colors
  BACKGROUND_LIGHT: '#FFFFFF',
  BACKGROUND_DARK: '#161616',
  // Transparent colors
  TRANSPARENT: '#00000000',
  // Default node color
  NODE_DEFAULT: '#0074D9'
} as const

const CONSTANTS = {
  NODE_DEFAULT_SIZE: 10,
  LABEL_FONT_SIZE: 2.5,
  NODE_FONT_SIZE: 3.5,
  PADDING_RATIO: 0.2,
  HALF_PI: Math.PI / 2,
  PI: Math.PI,
  MIN_FONT_SIZE: 0.5,
  LINK_WIDTH: 1,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 8,
  // LOD threshold (same for labels, icons, and links)
  ZOOM_NODE_DETAIL_THRESHOLD: 2,
  ZOOM_EDGE_DETAIL_THRESHOLD: 1,
  // Size multiplier for nodes when zoomed out (to make them visible from afar)
  ZOOMED_OUT_SIZE_MULTIPLIER: 3
}

// Reusable objects to avoid allocations
const tempPos = { x: 0, y: 0 }
const tempDimensions = [0, 0]

// Image cache for icons
const imageCache = new Map<string, HTMLImageElement>()
const imageLoadPromises = new Map<string, Promise<HTMLImageElement>>()

// Preload icon images
const preloadImage = (iconType: string): Promise<HTMLImageElement> => {
  const cacheKey = iconType
  // Return cached image if available
  if (imageCache.has(cacheKey)) {
    return Promise.resolve(imageCache.get(cacheKey)!)
  }
  // Return existing promise if already loading
  if (imageLoadPromises.has(cacheKey)) {
    return imageLoadPromises.get(cacheKey)!
  }
  // Create new loading promise
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      imageCache.set(cacheKey, img)
      imageLoadPromises.delete(cacheKey)
      resolve(img)
    }
    img.onerror = () => {
      imageLoadPromises.delete(cacheKey)
      reject(new Error(`Failed to load icon: ${iconType}`))
    }
    img.src = `/icons/${iconType}.svg`
  })
  imageLoadPromises.set(cacheKey, promise)
  return promise
}

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
  allowForces = false
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const isSelectorModeActive = useGraphControls((s) => s.isSelectorModeActive)
  const selectionMode = useGraphControls((s) => s.selectionMode)
  // Hover highlighting state
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set())
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set())
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  // const [currentZoom, setCurrentZoom] = useState<number>(1)
  // const zoomRef = useRef({ k: 1, x: 0, y: 0 })
  const hoverFrameRef = useRef<number | null>(null)
  const [isRegeneratingLayout, setIsRegeneratingLayout] = useState(false)

  // Use the dedicated hook for saving node positions
  const { saveAllNodePositions } = useSaveNodePositions(sketchId)

  // Store selectors (needed before useLayout)
  const forceSettings = useGraphSettingsStore((s) => s.forceSettings)

  // Use the dedicated hook for layout logic
  const { applyLayout } = useLayout({
    forceSettings,
    containerSize,
    saveAllNodePositions,
  })

  // Store references
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isGraphReadyRef = useRef(false)

  // Store selectors
  const nodeColors = useNodesDisplaySettings((s) => s.colors)
  const setActions = useGraphControls((s) => s.setActions)
  const currentLayoutType = useGraphControls((s) => s.currentLayoutType)
  const setCurrentLayoutType = useGraphControls((s) => s.setCurrentLayoutType)
  const shouldRegenerateLayoutOnNextRefetch = useGraphControls((s) => s.shouldRegenerateLayoutOnNextRefetch)
  const setShouldRegenerateLayoutOnNextRefetch = useGraphControls((s) => s.setShouldRegenerateLayoutOnNextRefetch)

  // Combine graph store selectors with useShallow for better performance
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
  const setImportModalOpen = useGraphSettingsStore((s) => s.setImportModalOpen)

  // Create Sets for O(1) lookups instead of O(n) array operations
  const selectedNodeIds = useMemo(
    () => new Set(selectedNodes.map(n => n.id)),
    [selectedNodes]
  )
  const currentNodeId = currentNode?.id

  // Create edgeMap for O(1) edge lookups in handleEdgeClick
  const edgeMap = useMemo(
    () => new Map(edges.map(e => [e.id, e])),
    [edges]
  )

  // Add state for tooltip
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    data: {
      label: string
      connections: string
      type: string
    } | null
    visible: boolean
  }>({
    x: 0,
    y: 0,
    data: null,
    visible: false
  })

  const graph2ScreenCoords = useCallback(
    (node: GraphNode) => {
      if (!graphRef.current) return { x: 0, y: 0 }
      return graphRef.current.graph2ScreenCoords(node.x, node.y)
    },
    []
  )

  // O(1) lookups instead of O(n)
  const isCurrent = useCallback(
    (nodeId: string) => nodeId === currentNodeId,
    [currentNodeId]
  )

  const isSelected = useCallback(
    (nodeId: string) => selectedNodeIds.has(nodeId),
    [selectedNodeIds]
  )

  // Preload icons when nodes change
  useEffect(() => {
    if (showIcons) {
      const iconTypes = new Set(nodes.map((node) => node.data?.type as ItemType).filter(Boolean))
      iconTypes.forEach((type) => {
        preloadImage(type).catch(console.warn) // Silently handle failures
      })
    }
  }, [nodes, showIcons])

  // const handleZoom = useCallback((zoom: any) => {
  //   const prevZoom = zoomRef.current.k
  //   zoomRef.current = zoom
  //   // Only update state if zoom changed significantly (reduces re-renders)
  //   const newZoom = zoom.k
  //   if (Math.abs(newZoom - prevZoom) > 0.1) {
  //     setCurrentZoom(newZoom)
  //   }
  // }, [])

  // Handle container size changes
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
    // Initial size
    updateSize()
    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    // Also listen for window resize events
    window.addEventListener('resize', updateSize)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  // Memoized graph data transformation with proper memoization dependencies
  const graphData = useMemo(() => {
    // Transform nodes
    const transformedNodes = nodes.map((node) => {
      const type = node.data?.type as ItemType

      // Calculate base node size (used for rendering calculations)
      const baseNodeSize = CONSTANTS.NODE_DEFAULT_SIZE

      const transformed = {
        ...node,
        nodeLabel: node.data?.label || node.id,
        nodeColor: nodeColors[type] || GRAPH_COLORS.NODE_DEFAULT,
        nodeSize: baseNodeSize,
        nodeType: type,
        // val is used by ForceGraph2D for collision detection and forces
        // Set it to the "zoomed out" size to ensure proper spacing
        val: baseNodeSize * CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER / 5,
        neighbors: [] as any[],
        links: [] as any[]
      } as GraphNode & { neighbors: any[]; links: any[] }

      // If node has saved positions, fix them so ForceGraph doesn't recalculate
      if (node.x !== undefined && node.y !== undefined) {
        // @ts-ignore
        transformed.fx = node.x
        // @ts-ignore
        transformed.fy = node.y
      }

      return transformed
    })
    // Create a map for quick node lookup
    const nodeMap = new Map(transformedNodes.map((node) => [node.id, node]))

    // Group and transform edges
    const edgeGroups = new Map<string, GraphEdge[]>()
    edges.forEach((edge) => {
      const key = `${edge.source}-${edge.target}`
      if (!edgeGroups.has(key)) {
        edgeGroups.set(key, [])
      }
      edgeGroups.get(key)!.push(edge)
    })
    const transformedEdges = edges.map((edge) => {
      const key = `${edge.source}-${edge.target}`
      const group = edgeGroups.get(key)!
      const groupIndex = group.indexOf(edge)
      const groupSize = group.length
      const curvature = groupSize > 1 ? (groupIndex - (groupSize - 1) / 2) * 0.2 : 0
      return {
        ...edge,
        edgeLabel: edge.label,
        curvature,
        groupIndex,
        groupSize
      }
    })

    // Build node relationships (neighbors and links) with O(1) Set lookups
    const neighborsMap = new Map<string, Set<any>>()
    const linksMap = new Map<string, any[]>()

    transformedEdges.forEach((link) => {
      const sourceNode = nodeMap.get(link.source)
      const targetNode = nodeMap.get(link.target)
      if (sourceNode && targetNode) {
        // Initialize Sets if they don't exist
        if (!neighborsMap.has(sourceNode.id)) neighborsMap.set(sourceNode.id, new Set())
        if (!neighborsMap.has(targetNode.id)) neighborsMap.set(targetNode.id, new Set())
        if (!linksMap.has(sourceNode.id)) linksMap.set(sourceNode.id, [])
        if (!linksMap.has(targetNode.id)) linksMap.set(targetNode.id, [])

        // Add neighbors using Set (O(1) instead of includes O(n))
        neighborsMap.get(sourceNode.id)!.add(targetNode)
        neighborsMap.get(targetNode.id)!.add(sourceNode)

        // Add links
        linksMap.get(sourceNode.id)!.push(link)
        linksMap.get(targetNode.id)!.push(link)
      }
    })

    // Assign neighbors and links to nodes (convert Set to Array for ForceGraph)
    transformedNodes.forEach((node) => {
      node.neighbors = Array.from(neighborsMap.get(node.id) || [])
      node.links = linksMap.get(node.id) || []
    })

    // Always use force layout - positions are preserved if they exist (fx/fy set above)
    return {
      nodes: transformedNodes,
      links: transformedEdges
    }
  }, [nodes, edges, nodeColors])

  // Regenerate layout by removing fixed positions and reheating simulation
  const regenerateLayout = useCallback((layoutType: 'force' | 'hierarchy') => {
    if (!graphRef.current) {
      throw new Error('Graph reference is not available')
    }

    if (!graphData || !graphData.nodes) {
      throw new Error('No nodes available in graph')
    }

    // Save the layout type in store for auto-regenerate after refetch
    setCurrentLayoutType(layoutType)
    setIsRegeneratingLayout(true)

    // Run layout calculation in worker (non-blocking)
    setTimeout(async () => {
      try {
        await applyLayout({
          layoutType,
          nodes: graphData.nodes,
          edges: graphData.links,
        })

        // Zoom to fit after layout is complete
        if (graphRef.current && typeof graphRef.current.zoomToFit === 'function') {
          graphRef.current.zoomToFit(400)
        }

        // Hide blur effect after zoom animation completes
        setTimeout(() => {
          setIsRegeneratingLayout(false)
        }, 400)
      } catch (error) {
        console.error('Layout calculation failed:', error)
        setIsRegeneratingLayout(false)
      }
    })
  }, [graphData, applyLayout, setCurrentLayoutType])

  // Optimized graph initialization callback
  const initializeGraph = useCallback(
    (graphInstance: any) => {
      if (!graphInstance) return
      // Check if the graph instance has the required methods
      if (
        typeof graphInstance.zoom !== 'function' ||
        typeof graphInstance.zoomToFit !== 'function'
      ) {
        // If methods aren't available yet, retry after a short delay
        setTimeout(() => {
          if (graphRef.current && !isGraphReadyRef.current) {
            initializeGraph(graphRef.current)
          }
        }, 100)
        return
      }
      if (isGraphReadyRef.current) return
      isGraphReadyRef.current = true
      // Only set global actions if no instanceId is provided (for main graph)
      if (!instanceId) {

        setActions({
          zoomIn: () => {
            if (graphRef.current && typeof graphRef.current.zoom === 'function') {
              const zoom = graphRef.current.zoom()
              graphRef.current.zoom(zoom * 1.5)
            }
          },
          zoomOut: () => {
            if (graphRef.current && typeof graphRef.current.zoom === 'function') {
              const zoom = graphRef.current.zoom()
              graphRef.current.zoom(zoom * 0.75)
            }
          },
          zoomToFit: () => {
            if (graphRef.current && typeof graphRef.current.zoomToFit === 'function') {
              graphRef.current.zoomToFit(400)
            }
          },
          regenerateLayout: regenerateLayout
        })
      }
      // Call external ref callback
      onGraphRef?.(graphInstance)
    },
    [setActions, onGraphRef, instanceId, regenerateLayout]
  )

  // Initialize graph once ready
  useEffect(() => {
    if (graphRef.current) {
      initializeGraph(graphRef.current)
    }
    return () => {
      if (!instanceId && isGraphReadyRef.current) {
        setActions({
          zoomIn: () => { },
          zoomOut: () => { },
          zoomToFit: () => { },
          regenerateLayout: () => { }
        })
        isGraphReadyRef.current = false
      }
    }
  }, [initializeGraph, instanceId, setActions])

  // Auto-center graph on initial load
  useEffect(() => {
    // Only auto-center if we have nodes and the graph is ready
    if (graphRef.current && graphData.nodes.length > 0 && containerSize.width > 0) {
      // Wait a bit for the simulation to settle, then center
      const timer = setTimeout(() => {
        if (graphRef.current && typeof graphRef.current.zoomToFit === 'function') {

          graphRef.current.zoomToFit(400)
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [graphData.nodes.length, containerSize.width])

  // Auto-regenerate layout when new nodes are added via refetch (from useEvents)
  useEffect(() => {
    if (shouldRegenerateLayoutOnNextRefetch && nodes.length > 0 && currentLayoutType) {
      setShouldRegenerateLayoutOnNextRefetch(false)
      regenerateLayout(currentLayoutType)
    }
  }, [nodes, shouldRegenerateLayoutOnNextRefetch, currentLayoutType, regenerateLayout, setShouldRegenerateLayoutOnNextRefetch])

  // Event handlers with proper memoization
  const handleNodeClick = useCallback(
    (node: any, event: MouseEvent) => {
      onNodeClick?.(node, event)
    },
    [onNodeClick]
  )

  const handleNodeRightClick = useCallback(
    (node: any, event: MouseEvent) => {
      onNodeRightClick?.(node, event)
    },
    [onNodeRightClick]
  )

  const handleEdgeRightClick = useCallback(
    (edge: any, event: MouseEvent) => {
      onEdgeRightClick?.(edge, event)
    },
    [onEdgeRightClick]
  )

  const handleEdgeClick = useCallback(
    (edge: any, event: MouseEvent) => {
      event.stopPropagation()
      const isMultiSelect = event.ctrlKey || event.shiftKey

      // O(1) lookup using edgeMap instead of O(n) find
      const fullEdge = edgeMap.get(edge.id)

      if (!fullEdge) return

      if (isMultiSelect) {
        // Multi-select: toggle edge in selection
        toggleEdgeSelection(fullEdge, true)
      } else {
        // Single select: set as current edge and clear selections
        setCurrentEdge(fullEdge)
        clearSelectedEdges()
      }
    },
    [toggleEdgeSelection, setCurrentEdge, clearSelectedEdges, edgeMap]
  )

  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.()
  }, [onBackgroundClick])

  const handleBackgroundRightClick = useCallback((event: MouseEvent) => {
    onBackgroundRightClick?.(event)
  }, [onBackgroundRightClick])

  const handleOpenNewAddItemDialog = useCallback(() => {
    setOpenMainDialog(true)
  }, [setOpenMainDialog])

  const handleOpenImportDialog = useCallback(() => {
    setImportModalOpen(true)
  }, [setImportModalOpen])

  // Handle node drag end - save ALL node positions
  const handleNodeDragEnd = useCallback((node: any) => {
    node.fx = node.x
    node.fy = node.y

    // Save positions of ALL nodes when one node is dragged
    // In a force-directed graph, moving one node can affect others
    if (graphData?.nodes) {
      saveAllNodePositions(graphData.nodes)
    }
  }, [graphData, saveAllNodePositions])


  // Throttled hover handlers using RAF for better performance
  const handleNodeHover = useCallback((node: any) => {
    // Cancel any pending RAF
    if (hoverFrameRef.current) {
      cancelAnimationFrame(hoverFrameRef.current)
    }

    // Schedule update on next frame
    hoverFrameRef.current = requestAnimationFrame(() => {
      const newHighlightNodes = new Set<string>()
      const newHighlightLinks = new Set<string>()
      if (node) {
        // Add the hovered node
        newHighlightNodes.add(node.id)
        // Add connected nodes and links
        if (node.neighbors) {
          node.neighbors.forEach((neighbor: any) => {
            newHighlightNodes.add(neighbor.id)
          })
        }
        if (node.links) {
          node.links.forEach((link: any) => {
            newHighlightLinks.add(`${link.source.id}-${link.target.id}`)
          })
        }
        setHoverNode(node.id)
      } else {
        setHoverNode(null)
      }
      setHighlightNodes(newHighlightNodes)
      setHighlightLinks(newHighlightLinks)
      hoverFrameRef.current = null
    })
  }, [])

  // Enhanced node hover with tooltip
  const handleNodeHoverWithTooltip = useCallback(
    (node: any) => {
      if (node) {
        const weight = node.neighbors?.length || 0
        const label = node.nodeLabel || node.label || node.id
        // Position tooltip above the node using the graph's coordinate conversion
        if (graphRef.current) {
          try {
            // Use the graph's built-in method to convert graph coordinates to screen coordinates
            const screenCoords = graphRef.current.graph2ScreenCoords(node.x, node.y)
            // Ensure tooltip stays within viewport bounds
            const tooltipWidth = 120 // Approximate tooltip width
            const tooltipHeight = 60 // Approximate tooltip height
            let x = screenCoords.x
            let y = screenCoords.y - 30 // Position above the node
            // Adjust X position if tooltip would go off-screen
            if (x + tooltipWidth > window.innerWidth) {
              x = window.innerWidth - tooltipWidth - 10
            }
            if (x < 10) {
              x = 10
            }
            // Adjust Y position if tooltip would go off-screen
            if (y < tooltipHeight + 10) {
              y = screenCoords.y + 100 // Position below the node instead
            }
            setTooltip({
              x,
              y,
              data: {
                label,
                type: node.data?.type || 'unknown',
                connections: weight.toString()
              },
              visible: true
            })
          } catch (error) {
            // Fallback: hide tooltip if coordinate conversion fails
            setTooltip((prev) => ({ ...prev, visible: false }))
          }
        }
      } else {
        setTooltip((prev) => ({ ...prev, visible: false }))
      }
      handleNodeHover(node)
    },
    [handleNodeHover]
  )

  const handleLinkHover = useCallback((link: any) => {
    // Cancel any pending RAF
    if (hoverFrameRef.current) {
      cancelAnimationFrame(hoverFrameRef.current)
    }

    // Schedule update on next frame
    hoverFrameRef.current = requestAnimationFrame(() => {
      const newHighlightNodes = new Set<string>()
      const newHighlightLinks = new Set<string>()
      if (link) {
        // Add the hovered link (extract IDs from source/target objects)
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source
        const targetId = typeof link.target === 'object' ? link.target.id : link.target
        newHighlightLinks.add(`${sourceId}-${targetId}`)
        // Add connected nodes
        newHighlightNodes.add(sourceId)
        newHighlightNodes.add(targetId)
      }
      setHoverNode(null)
      setHighlightNodes(newHighlightNodes)
      setHighlightLinks(newHighlightLinks)
      hoverFrameRef.current = null
    })
  }, [])

  // Optimized node rendering with zoom-based LOD
  const renderNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      // Calculate render size based on node properties and settings
      // Note: node.val is already set in graphData and should not be modified here
      const sizeMultiplier = forceSettings.nodeSize.value / 100 + 0.2
      const neighborBonus = Math.min(node.neighbors.length / 5, 5)
      const baseSize = (node.nodeSize + neighborBonus) * sizeMultiplier

      // LOD: Check if we should render details (labels, icons)
      const shouldRenderDetails = globalScale > CONSTANTS.ZOOM_NODE_DETAIL_THRESHOLD

      // For rendering: when zoomed out, make nodes bigger (more visible from afar)
      // When zoomed in, keep them smaller to make room for labels
      const size = shouldRenderDetails
        ? baseSize
        : baseSize * CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER

      const isHighlighted = highlightNodes.has(node.id) || isSelected(node.id)
      const hasAnyHighlight = highlightNodes.size > 0 || highlightLinks.size > 0
      const isHovered = hoverNode === node.id || isCurrent(node.id)

      // Draw highlight ring for highlighted nodes with constant border width
      if (isHighlighted) {
        // Border width adapts to zoom level for consistent visual appearance
        const borderWidth = 3 / globalScale
        ctx.beginPath()
        ctx.arc(node.x, node.y, size + borderWidth, 0, 2 * Math.PI)
        ctx.fillStyle = isHovered
          ? GRAPH_COLORS.NODE_HIGHLIGHT_HOVER
          : GRAPH_COLORS.NODE_HIGHLIGHT_DEFAULT
        ctx.fill()
      }

      // Set node color based on highlight state
      if (hasAnyHighlight) {
        ctx.fillStyle = isHighlighted ? node.nodeColor : `${node.nodeColor}7D`
      } else {
        ctx.fillStyle = node.nodeColor
      }

      // Draw node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
      ctx.fill()

      // Early exit if not zoomed in enough for details
      if (!shouldRenderDetails) return

      // Render icons when zoomed in
      if (showIcons && node.nodeType) {
        const cachedImage = imageCache.get(node.nodeType)
        if (cachedImage && cachedImage.complete) {
          try {
            ctx.drawImage(cachedImage, node.x - size / 2, node.y - size / 2, size, size)
          } catch (error) {
            // Silently handle drawing errors
          }
        }
      }

      // Render labels when zoomed in
      if (showLabels) {
        const label = truncateText(node.nodeLabel || node.label || node.id, 58)
        if (label) {
          const baseFontSize = Math.max(
            CONSTANTS.MIN_FONT_SIZE,
            (CONSTANTS.NODE_FONT_SIZE * (size / 2)) / globalScale + 2
          )
          const nodeLabelSetting = forceSettings?.nodeLabelFontSize?.value ?? 50
          const fontSize = baseFontSize * (nodeLabelSetting / 100)
          ctx.font = `${fontSize}px Sans-Serif`

          // Measure text for background sizing
          const textWidth = ctx.measureText(label).width
          const paddingX = fontSize * 0.4
          const paddingY = fontSize * 0.25
          const bgWidth = textWidth + paddingX * 2
          const bgHeight = fontSize + paddingY * 2
          const borderRadius = fontSize * 0.3
          const bgY = node.y + size / 2 + fontSize * 0.6

          // Draw rounded rectangle background
          const bgX = node.x - bgWidth / 2
          ctx.beginPath()
          ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius)

          // Background color with theme awareness
          if (theme === 'light') {
            ctx.fillStyle = isHighlighted
              ? 'rgba(255, 255, 255, 0.95)'
              : 'rgba(255, 255, 255, 0.75)'
          } else {
            ctx.fillStyle = isHighlighted
              ? 'rgba(32, 32, 32, 0.95)'
              : 'rgba(32, 32, 32, 0.75)'
          }
          ctx.fill()

          // Subtle border for depth
          ctx.strokeStyle = theme === 'light'
            ? 'rgba(0, 0, 0, 0.1)'
            : 'rgba(255, 255, 255, 0.1)'
          ctx.lineWidth = 0.1
          ctx.stroke()

          // Draw text
          const color = theme === 'light' ? GRAPH_COLORS.TEXT_LIGHT : GRAPH_COLORS.TEXT_DARK
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = isHighlighted ? color : `${color}CC` // 80% opacity
          ctx.fillText(label, node.x, bgY + bgHeight / 2)
        }
      }
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

  const renderLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      // LOD: Skip rendering links entirely when zoomed out (performance optimization)
      if (globalScale < CONSTANTS.ZOOM_EDGE_DETAIL_THRESHOLD) return

      const { source: start, target: end } = link
      if (typeof start !== 'object' || typeof end !== 'object') return
      const linkKey = `${start.id}-${end.id}`
      const isHighlighted = highlightLinks.has(linkKey)
      const isSelected = selectedEdges.some((e) => e.id === link.id)
      const isCurrent = currentEdge?.id === link.id
      const hasAnyHighlight = highlightNodes.size > 0 || highlightLinks.size > 0
      const linkWidth = forceSettings?.linkWidth?.value ?? 2
      const nodeSize = forceSettings?.nodeSize?.value ?? 14
      let strokeStyle: string
      let lineWidth: number
      let fillStyle: string
      if (isCurrent) {
        // Current edge: use blue/primary color with thicker line
        strokeStyle = 'rgba(59, 130, 246, 0.95)'
        fillStyle = 'rgba(59, 130, 246, 0.95)'
        lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 2.3)
      } else if (isSelected) {
        // Selected edges: use orange/highlight color with thicker line
        strokeStyle = 'rgba(255, 115, 0, 0.9)'
        fillStyle = 'rgba(255, 115, 0, 0.9)'
        lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 2.5)
      } else if (isHighlighted) {
        strokeStyle = GRAPH_COLORS.LINK_HIGHLIGHTED
        fillStyle = GRAPH_COLORS.LINK_HIGHLIGHTED
        lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 3)
      } else if (hasAnyHighlight) {
        strokeStyle = GRAPH_COLORS.LINK_DIMMED
        fillStyle = GRAPH_COLORS.LINK_DIMMED
        lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 5)
      } else {
        strokeStyle = GRAPH_COLORS.LINK_DEFAULT
        fillStyle = GRAPH_COLORS.LINK_DEFAULT
        lineWidth = CONSTANTS.LINK_WIDTH * (linkWidth / 5)
      }
      // Draw connection line (use quadratic curve if curvature present)
      const curvature: number = link.curvature || 0
      const dx = end.x - start.x
      const dy = end.y - start.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1
      const midX = (start.x + end.x) * 0.5
      const midY = (start.y + end.y) * 0.5
      const normX = -dy / distance
      const normY = dx / distance
      const offset = curvature * distance
      const ctrlX = midX + normX * offset
      const ctrlY = midY + normY * offset
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      if (curvature !== 0) {
        ctx.quadraticCurveTo(ctrlX, ctrlY, end.x, end.y)
      } else {
        ctx.lineTo(end.x, end.y)
      }
      ctx.strokeStyle = strokeStyle
      ctx.lineWidth = lineWidth
      ctx.stroke()
      // Draw directional arrow
      const arrowLength = forceSettings?.linkDirectionalArrowLength?.value
      if (arrowLength && arrowLength > 0) {
        const arrowRelPos = forceSettings?.linkDirectionalArrowRelPos?.value || 1
        // Helper to get point and tangent along straight/curved link
        const bezierPoint = (t: number) => {
          if (curvature === 0) {
            return { x: start.x + dx * t, y: start.y + dy * t }
          }
          const oneMinusT = 1 - t
          return {
            x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * ctrlX + t * t * end.x,
            y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * ctrlY + t * t * end.y
          }
        }
        const bezierTangent = (t: number) => {
          if (curvature === 0) {
            return { x: dx, y: dy }
          }
          const oneMinusT = 1 - t
          return {
            x: 2 * oneMinusT * (ctrlX - start.x) + 2 * t * (end.x - ctrlX),
            y: 2 * oneMinusT * (ctrlY - start.y) + 2 * t * (end.y - ctrlY)
          }
        }
        const t = arrowRelPos
        let { x: arrowX, y: arrowY } = bezierPoint(t)
        if (arrowRelPos === 1) {
          const tan = bezierTangent(0.99)
          const tanLen = Math.hypot(tan.x, tan.y) || 1
          // Calculate target node size consistently with renderNode logic
          const sizeMultiplier = nodeSize / 100 + 0.2
          const neighborBonus = Math.min(end.neighbors?.length / 5 || 0, 5)
          const baseTargetSize = (end.nodeSize + neighborBonus) * sizeMultiplier
          const targetNodeSize = globalScale > CONSTANTS.ZOOM_NODE_DETAIL_THRESHOLD
            ? baseTargetSize
            : baseTargetSize * CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER
          arrowX = end.x - (tan.x / tanLen) * targetNodeSize
          arrowY = end.y - (tan.y / tanLen) * targetNodeSize
        }
        const tan = bezierTangent(t)
        const angle = Math.atan2(tan.y, tan.x)
        // Draw arrow head
        ctx.save()
        ctx.translate(arrowX, arrowY)
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-arrowLength, -arrowLength * 0.5)
        ctx.lineTo(-arrowLength, arrowLength * 0.5)
        ctx.closePath()
        ctx.fillStyle = fillStyle
        ctx.fill()
        ctx.restore()
      }
      // Early exit if no label
      if (!link.label) return
      // LOD: Only show labels for highlighted links when zoomed in enough
      if (isHighlighted && globalScale > CONSTANTS.ZOOM_EDGE_DETAIL_THRESHOLD) {
        // Calculate label position and angle along straight/curved link
        let textAngle: number
        if ((link.curvature || 0) !== 0) {
          // Bezier midpoint and tangent at t=0.5
          const t = 0.5
          const oneMinusT = 1 - t
          tempPos.x = oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * ctrlX + t * t * end.x
          tempPos.y = oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * ctrlY + t * t * end.y
          const tx = 2 * oneMinusT * (ctrlX - start.x) + 2 * t * (end.x - ctrlX)
          const ty = 2 * oneMinusT * (ctrlY - start.y) + 2 * t * (end.y - ctrlY)
          textAngle = Math.atan2(ty, tx)
        } else {
          tempPos.x = (start.x + end.x) * 0.5
          tempPos.y = (start.y + end.y) * 0.5
          const sdx = end.x - start.x
          const sdy = end.y - start.y
          textAngle = Math.atan2(sdy, sdx)
        }
        // Flip text for readability
        if (textAngle > CONSTANTS.HALF_PI || textAngle < -CONSTANTS.HALF_PI) {
          textAngle += textAngle > 0 ? -CONSTANTS.PI : CONSTANTS.PI
        }
        const linkLabelSetting = forceSettings?.linkLabelFontSize?.value ?? 50
        // Measure and draw label with dynamic font size
        const linkFontSize = CONSTANTS.LABEL_FONT_SIZE * (linkLabelSetting / 100)
        ctx.font = `${linkFontSize}px Sans-Serif`
        const textWidth = ctx.measureText(link.label).width
        const padding = linkFontSize * CONSTANTS.PADDING_RATIO
        tempDimensions[0] = textWidth + padding
        tempDimensions[1] = linkFontSize + padding
        const halfWidth = tempDimensions[0] * 0.5
        const halfHeight = tempDimensions[1] * 0.5
        // Batch canvas operations
        ctx.save()
        ctx.translate(tempPos.x, tempPos.y)
        ctx.rotate(textAngle)
        // Draw rounded rectangle background
        const borderRadius = linkFontSize * 0.3
        ctx.beginPath()
        ctx.roundRect(-halfWidth, -halfHeight, tempDimensions[0], tempDimensions[1], borderRadius)
        // Background with semi-transparency
        if (theme === 'light') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        } else {
          ctx.fillStyle = 'rgba(32, 32, 32, 0.95)'
        }
        ctx.fill()
        // Subtle border for depth
        ctx.strokeStyle = theme === 'light'
          ? 'rgba(0, 0, 0, 0.1)'
          : 'rgba(255, 255, 255, 0.1)'
        ctx.lineWidth = 0.5
        ctx.stroke()
        // Text - follow same highlighting behavior as links
        ctx.fillStyle = isHighlighted
          ? GRAPH_COLORS.LINK_LABEL_HIGHLIGHTED
          : GRAPH_COLORS.LINK_LABEL_DEFAULT
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(link.label, 0, 0)
        ctx.restore()
      }
    },
    [forceSettings, theme, highlightLinks, highlightNodes, selectedEdges, currentEdge]
  )

  // Clear highlights when graph data changes
  useEffect(() => {
    setHighlightNodes(new Set())
    setHighlightLinks(new Set())
    setHoverNode(null)
  }, [nodes, edges])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (hoverFrameRef.current) {
        cancelAnimationFrame(hoverFrameRef.current)
      }
    }
  }, [])

  // Empty state
  if (!nodes.length) {
    return (
      <div
        ref={containerRef}
        className={`flex h-full w-full items-center justify-center ${className}`}
        style={style}
      >
        <div className="text-center text-muted-foreground max-w-md mx-auto p-6">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No data to visualize</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start your investigation by adding nodes to see them displayed in the graph view.
          </p>
          <div className="space-y-2 text-xs text-muted-foreground mb-6">
            <p>
              <strong>Tip:</strong> Use the search bar to find entities or import data to get
              started
            </p>
            <p>
              <strong>Explore:</strong> Try searching for domains, emails, or other entities
            </p>
            <p>
              <strong>Labels:</strong> Zoom in (over 2x) to see all labels, icons, and edges
            </p>
          </div>
          <div className='flex flex-col justify-center gap-1'>
            <Button onClick={handleOpenNewAddItemDialog}>
              <Plus />
              Add your first item
            </Button>
            <span className='opacity-60'>or</span>
            <Button variant="secondary" onClick={handleOpenImportDialog}>
              <Upload /> Import data
            </Button>
          </div>
        </div>
      </div >
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
      {tooltip.visible && (
        <div
          className="absolute z-20 bg-background border rounded-lg p-2 shadow-lg text-xs pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)' // Center horizontally on the node
          }}
        >
          <div className="whitespace-pre-line truncate flex flex-col gap-1">
            <span className="text-md font-semibold">{tooltip.data?.label}</span>
            <span className="flex items-center gap-1">
              <span className="flex items-center gap-1 opacity-60">
                <Type className="h-3 w-3" /> type:
              </span>{' '}
              <span className="font-medium">{tooltip.data?.type}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="flex items-center gap-1 opacity-60">
                <Share2 className="h-3 w-3" /> connections:
              </span>{' '}
              <span className="font-medium">{tooltip.data?.connections}</span>
            </span>
          </div>
        </div>
      )}
      <ForceGraph2D
        ref={graphRef}
        width={containerSize.width}
        height={containerSize.height}
        graphData={graphData}
        maxZoom={CONSTANTS.MAX_ZOOM}
        minZoom={CONSTANTS.MIN_ZOOM}
        nodeLabel={() => ''}
        // nodeColor={node => shouldUseSimpleRendering ? node.nodeColor : GRAPH_COLORS.TRANSPARENT}
        nodeRelSize={3}
        onNodeRightClick={handleNodeRightClick}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        onBackgroundRightClick={handleBackgroundRightClick}
        onLinkClick={handleEdgeClick}
        onLinkRightClick={handleEdgeRightClick}
        linkCurvature={(link) => link.curvature || 0}
        nodeCanvasObject={renderNode}
        onNodeDragEnd={handleNodeDragEnd}
        cooldownTicks={allowForces ? forceSettings.cooldownTicks.value : 0}
        cooldownTime={forceSettings.cooldownTime.value}
        d3AlphaDecay={forceSettings.d3AlphaDecay.value}
        d3AlphaMin={forceSettings.d3AlphaMin.value}
        d3VelocityDecay={forceSettings.d3VelocityDecay.value}
        warmupTicks={forceSettings?.warmupTicks?.value ?? 0}
        dagLevelDistance={forceSettings.dagLevelDistance.value}
        backgroundColor={backgroundColor}
        // onZoom={handleZoom}
        // onZoomEnd={handleZoom}
        linkCanvasObject={renderLink}
        enableNodeDrag={true}
        autoPauseRedraw={true}
        onNodeHover={handleNodeHoverWithTooltip}
        onLinkHover={handleLinkHover}
      />
      {allowLasso && isSelectorModeActive && (
        <>
          <div
            className="absolute z-20 top-3 flex items-center gap-1 left-3 bg-primary/20 text-primary border border-primary/40 rounded-lg p-1 px-2 text-xs pointer-events-none"
          >
            <Info className='h-3 w-3 ' />
            {selectionMode === 'lasso' ? 'Lasso' : 'Rectangle'} selection is active
          </div>
          {selectionMode === 'lasso' ? (
            <Lasso
              nodes={graphData.nodes}
              graph2ScreenCoords={graph2ScreenCoords}
              partial={true}
              width={containerSize.width}
              height={containerSize.height}
            />
          ) : (
            <Rectangle
              nodes={graphData.nodes}
              graph2ScreenCoords={graph2ScreenCoords}
              partial={true}
              width={containerSize.width}
              height={containerSize.height}
            />
          )}
        </>
      )}
      {isRegeneratingLayout && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/30">
          <div className="flex flex-col items-center gap-3 p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">Regenerating layout...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default GraphViewer
