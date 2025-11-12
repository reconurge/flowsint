import { getDagreLayoutedElements } from '@/lib/utils'
import { useGraphControls } from '@/stores/graph-controls-store'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { useGraphStore } from '@/stores/graph-store'
import { ItemType, useNodesDisplaySettings } from '@/stores/node-display-settings'
import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Button } from '../ui/button'
import { useTheme } from '@/components/theme-provider'
import { Info, Plus, Share2, Type, Upload } from 'lucide-react'
import Lasso from './lasso'
import { GraphNode, GraphEdge } from '@/types'
import MiniMap from './minimap'

function truncateText(text: string, limit: number = 16) {
  if (text.length <= limit) return text
  return text.substring(0, limit) + '...'
}

interface GraphViewerProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  // Remove width and height props - component will handle its own sizing
  nodeColors?: Record<string, string>
  nodeSizes?: Record<string, number>
  onNodeClick?: (node: GraphNode, event: MouseEvent) => void
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void
  onBackgroundClick?: () => void
  showLabels?: boolean
  showIcons?: boolean
  backgroundColor?: string
  className?: string
  style?: React.CSSProperties
  onGraphRef?: (ref: any) => void
  instanceId?: string // Add instanceId prop for instance-specific actions
  allowLasso?: boolean
  minimap?: boolean
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
  NODE_COUNT_THRESHOLD: 400,
  NODE_DEFAULT_SIZE: 10,
  NODE_LABEL_FONT_SIZE: 3.5,
  LABEL_FONT_SIZE: 2.5,
  NODE_FONT_SIZE: 3.5,
  LABEL_NODE_MARGIN: 18,
  PADDING_RATIO: 0.2,
  HALF_PI: Math.PI / 2,
  PI: Math.PI,
  MEASURE_FONT: '1px Sans-Serif',
  MIN_FONT_SIZE: 0.5,
  LINK_WIDTH: 1,
  ARROW_SIZE: 8,
  ARROW_ANGLE: Math.PI / 6,
  MIN_ZOOM: 0.4,
  MAX_ZOOM: 8,
  // Dynamic label thresholds based on zoom
  MIN_VISIBLE_LABELS: 5,
  MAX_VISIBLE_LABELS_PER_ZOOM: 15
}

interface LabelRenderingCompound {
  weightList: Map<string, number>
  constants: {
    nodesLength: number
  }
}

// Pre-computed constants
const LABEL_FONT_STRING = `${CONSTANTS.LABEL_FONT_SIZE}px Sans-Serif`

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
  // Remove width and height from destructuring
  onNodeClick,
  onNodeRightClick,
  onBackgroundClick,
  showLabels = true,
  showIcons = true,
  backgroundColor = 'transparent',
  className = '',
  style,
  onGraphRef,
  instanceId,
  allowLasso = false,
  minimap = false
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const isLassoActive = useGraphControls((s) => s.isLassoActive)
  // Hover highlighting state
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set())
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set())
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const [currentZoom, setCurrentZoom] = useState<number>(1)
  const zoomRef = useRef({ k: 1, x: 0, y: 0 })
  const hoverFrameRef = useRef<number | null>(null)
  // The ref for the node weighlist.
  const labelRenderingCompound = useRef<LabelRenderingCompound>({
    weightList: new Map(),
    constants: {
      nodesLength: 0
    }
  })
  // Store references
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isGraphReadyRef = useRef(false)

  // Store selectors
  const nodeColors = useNodesDisplaySettings((s) => s.colors)
  const getSize = useNodesDisplaySettings((s) => s.getSize)
  const view = useGraphControls((s) => s.view)

  // Get settings by categories to avoid re-renders
  const forceSettings = useGraphSettingsStore((s) => s.forceSettings)
  const setActions = useGraphControls((s) => s.setActions)
  const currentNode = useGraphStore((s) => s.currentNode)
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const { theme } = useTheme()
  const setOpenMainDialog = useGraphStore((state) => state.setOpenMainDialog)
  const setImportModalOpen = useGraphSettingsStore((s) => s.setImportModalOpen)

  const shouldUseSimpleRendering = useMemo(
    () => nodes.length > CONSTANTS.NODE_COUNT_THRESHOLD || currentZoom < 1.5,
    [nodes.length, currentZoom]
  )

  // Pre-compute visible labels based on zoom and node weight (O(n) once per zoom change)
  const visibleLabels = useMemo(() => {
    if (!showLabels || labelRenderingCompound.current.weightList.size === 0) {
      return new Set<string>()
    }

    const totalNodes = labelRenderingCompound.current.constants.nodesLength
    if (totalNodes === 0) return new Set<string>()

    // Calculate how many labels to show based on zoom
    // More zoom = more labels (progressive disclosure)
    const zoomFactor = Math.max(CONSTANTS.MIN_ZOOM, Math.min(CONSTANTS.MAX_ZOOM, currentZoom))
    const zoomRatio = (zoomFactor - CONSTANTS.MIN_ZOOM) / (CONSTANTS.MAX_ZOOM - CONSTANTS.MIN_ZOOM)

    // Scale from MIN_VISIBLE_LABELS to a percentage of total nodes
    const maxLabelsAtZoom = Math.floor(
      CONSTANTS.MIN_VISIBLE_LABELS +
      zoomRatio * Math.min(totalNodes * 0.5, CONSTANTS.MAX_VISIBLE_LABELS_PER_ZOOM * zoomFactor)
    )

    // Take the top N nodes by weight (connection count)
    const visibleSet = new Set<string>()
    let count = 0
    for (const [nodeId] of labelRenderingCompound.current.weightList) {
      if (count >= maxLabelsAtZoom) break
      visibleSet.add(nodeId)
      count++
    }

    return visibleSet
  }, [currentZoom, showLabels, labelRenderingCompound.current.weightList.size, labelRenderingCompound.current.constants.nodesLength])

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
      return graphRef.current.graph2ScreenCoords(node.x, node.y)
    },
    [graphRef.current]
  )

  const isCurrent = useCallback(
    (nodeId: string) => {
      return currentNode?.id === nodeId
    },
    [currentNode]
  )

  const isSelected = useCallback(
    (nodeId: string) => {
      return selectedNodes.some((node) => node.id === nodeId)
    },
    [selectedNodes]
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

  const handleZoom = useCallback((zoom: any) => {
    zoomRef.current = zoom
    // Only update state if zoom changed significantly (reduces re-renders)
    const newZoom = zoom.k
    if (Math.abs(newZoom - currentZoom) > 0.1) {
      setCurrentZoom(newZoom)
    }
  }, [currentZoom])

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
          }
        })
      }
      // Call external ref callback
      onGraphRef?.(graphInstance)
    },
    [setActions, onGraphRef, instanceId]
  )

  // Handle graph ref changes and ensure actions are set up
  useEffect(() => {
    if (graphRef.current) {
      initializeGraph(graphRef.current)
    }
    // Cleanup: reset actions when component unmounts (only for main graph)
    return () => {
      if (!instanceId && isGraphReadyRef.current) {
        setActions({
          zoomIn: () => { },
          zoomOut: () => { },
          zoomToFit: () => { }
        })
        isGraphReadyRef.current = false
      }
    }
  }, [initializeGraph])

  // Additional effect to ensure actions are set up when graph is ready
  useEffect(() => {
    if (graphRef.current && !instanceId && !isGraphReadyRef.current) {
      // Try to initialize again if the graph is available but not marked as ready
      initializeGraph(graphRef.current)
    }
  }, [graphRef.current, initializeGraph, instanceId])

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
      return {
        ...node,
        nodeLabel: node.data?.label || node.id,
        nodeColor: nodeColors[type] || GRAPH_COLORS.NODE_DEFAULT,
        nodeSize: CONSTANTS.NODE_DEFAULT_SIZE,
        nodeType: type,
        val: CONSTANTS.NODE_DEFAULT_SIZE,
        neighbors: [] as any[],
        links: [] as any[]
      } as GraphNode & { neighbors: any[]; links: any[] }
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
    // Build node relationships (neighbors and links)
    transformedEdges.forEach((link) => {
      const sourceNode = nodeMap.get(link.source)
      const targetNode = nodeMap.get(link.target)
      if (sourceNode && targetNode) {
        // Add neighbors
        if (!sourceNode.neighbors.includes(targetNode)) {
          sourceNode.neighbors.push(targetNode)
        }
        if (!targetNode.neighbors.includes(sourceNode)) {
          targetNode.neighbors.push(sourceNode)
        }
        // Add links
        sourceNode.links.push(link)
        targetNode.links.push(link)
      }
    })
    // feed the labelRenderingCompound
    labelRenderingCompound.current.weightList = new Map(
      transformedNodes
        .sort((a, b) => b.neighbors.length - a.neighbors.length)
        .map((node) => [node.id, node.neighbors.length])
    )
    labelRenderingCompound.current.constants = { nodesLength: transformedNodes.length }
    // Handle hierarchy layout
    if (view === 'hierarchy') {
      const { nodes: nds, edges: eds } = getDagreLayoutedElements(
        transformedNodes,
        transformedEdges
      )
      return {
        nodes: nds.map((nd) => ({
          ...nd,
          // Preserve the neighbors and links from the original transformed node
          neighbors: nodeMap.get(nd.id)?.neighbors || [],
          links: nodeMap.get(nd.id)?.links || []
        })),
        links: eds
      }
    }
    return {
      nodes: transformedNodes,
      links: transformedEdges
    }
  }, [nodes, edges, nodeColors, getSize, view])

  // Retry initialization if graph data changes and actions aren't set up
  useEffect(() => {
    if (graphData.nodes.length > 0 && graphRef.current && !instanceId && !isGraphReadyRef.current) {
      // Small delay to ensure the graph has rendered
      const timeoutId = setTimeout(() => {
        if (graphRef.current && !isGraphReadyRef.current) {
          initializeGraph(graphRef.current)
        }
      }, 200)
      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [graphData.nodes.length, initializeGraph, instanceId])


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

  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.()
  }, [onBackgroundClick])

  const handleOpenNewAddItemDialog = useCallback(() => {
    setOpenMainDialog(true)
  }, [setOpenMainDialog])

  const handleOpenImportDialog = useCallback(() => {
    setImportModalOpen(true)
  }, [setImportModalOpen])


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
                type: node.data.type,
                connections: weight
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

  // Optimized node rendering with proper icon caching
  const renderNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const shouldUseSimpleRendering =
        nodes.length > CONSTANTS.NODE_COUNT_THRESHOLD || globalScale < 1.5
      const size =
        Math.min(node.nodeSize + node.neighbors.length / 5, 20) *
        (forceSettings.nodeSize.value / 100 + 0.4)
      node.val = size / 5
      const isHighlighted = highlightNodes.has(node.id) || isSelected(node.id)
      const hasAnyHighlight = highlightNodes.size > 0 || highlightLinks.size > 0
      const isHovered = hoverNode === node.id || isCurrent(node.id)
      // Draw highlight ring for highlighted nodes
      if (isHighlighted) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, size * 1.2, 0, 2 * Math.PI)
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
      ctx.beginPath()
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
      ctx.fill()
      // Early exit for simple rendering
      if (shouldUseSimpleRendering && !isHovered) return
      // Optimized icon rendering with cached images
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
      // Optimized label rendering with layered display
      if (showLabels) {
        const label = truncateText(node.nodeLabel || node.label || node.id, 58)
        if (label) {
          // Check if this node's label should be visible (O(1) lookup)
          const shouldShowLabel = visibleLabels.has(node.id)
          // Always show labels for highlighted nodes
          if (!shouldShowLabel && !isHighlighted) {
            return
          }
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
          ctx.lineWidth = 0.5
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
      hoverNode,
      visibleLabels,
      nodes.length
    ]
  )

  const renderLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { source: start, target: end } = link
      if (typeof start !== 'object' || typeof end !== 'object') return
      const linkKey = `${start.id}-${end.id}`
      const isHighlighted = highlightLinks.has(linkKey)
      const hasAnyHighlight = highlightNodes.size > 0 || highlightLinks.size > 0
      const linkWidth = forceSettings?.linkWidth?.value ?? 2
      const nodeSize = forceSettings?.nodeSize?.value ?? 14
      let strokeStyle: string
      let lineWidth: number
      let fillStyle: string
      if (isHighlighted) {
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
          const targetNodeSize =
            (end.nodeSize || CONSTANTS.NODE_DEFAULT_SIZE) *
            (nodeSize / 100 + 0.4)
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
      // Always show labels for highlighted links (even in simple rendering mode for better UX)
      if (isHighlighted) {
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
    [forceSettings, theme, highlightLinks, highlightNodes, nodes.length]
  )

  // Restart simulation when settings change (debounced)
  useEffect(() => {
    let settingsTimeout: number | undefined
    const restartSimulation = () => {
      if (graphRef.current && isGraphReadyRef.current) {
        if (settingsTimeout) clearTimeout(settingsTimeout)
        settingsTimeout = setTimeout(() => {
          graphRef.current?.d3ReheatSimulation()
        }, 100) as any // Debounce settings changes
      }
    }
    // Restart simulation when force settings change
    restartSimulation()
    return () => {
      if (settingsTimeout) clearTimeout(settingsTimeout)
    }
  }, [forceSettings])

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
              <strong>Labels:</strong> Zoom in to see node labels progressively by connection weight
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
        nodeLabel={() => ''}
        // nodeColor={node => shouldUseSimpleRendering ? node.nodeColor : GRAPH_COLORS.TRANSPARENT}
        nodeRelSize={6}
        onNodeRightClick={handleNodeRightClick}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        linkCurvature={(link) => link.curvature || 0}
        nodeCanvasObject={renderNode}
        onNodeDragEnd={(node) => {
          node.fx = node.x
          node.fy = node.y
        }}
        cooldownTicks={view === 'hierarchy' ? 0 : forceSettings.cooldownTicks.value}
        cooldownTime={forceSettings.cooldownTime.value}
        d3AlphaDecay={forceSettings.d3AlphaDecay.value}
        d3AlphaMin={forceSettings.d3AlphaMin.value}
        d3VelocityDecay={forceSettings.d3VelocityDecay.value}
        warmupTicks={forceSettings?.warmupTicks?.value ?? 0}
        dagLevelDistance={forceSettings.dagLevelDistance.value}
        backgroundColor={backgroundColor}
        onZoom={handleZoom}
        onZoomEnd={handleZoom}
        linkCanvasObject={renderLink}
        enableNodeDrag={!shouldUseSimpleRendering}
        autoPauseRedraw={true}
        onNodeHover={handleNodeHoverWithTooltip}
        onLinkHover={handleLinkHover}
      />
      {allowLasso && isLassoActive && (
        <>
          <div
            className="absolute z-20 top-14 flex items-center gap-1 left-3 bg-primary/20 text-primary border border-primary rounded-lg p-1 px-2 shadow-lg text-xs pointer-events-none"
          ><Info className='h-3 w-3 ' /> Lasso is active</div>
          <Lasso
            nodes={graphData.nodes}
            graph2ScreenCoords={graph2ScreenCoords}
            partial={true}
            width={containerSize.width}
            height={containerSize.height}
          />
        </>
      )}
      {/* {minimap && graphData.nodes &&
                <MiniMap zoomTransform={zoomState}
                    canvasWidth={containerSize.width}
                    canvasHeight={containerSize.height}
                    nodes={graphData.nodes as GraphNode[]} />} */}
    </div>
  )
}

export default GraphViewer
