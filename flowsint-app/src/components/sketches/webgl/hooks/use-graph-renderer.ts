import { useEffect, useRef, useState, useCallback } from 'react'
import { Graphics, Sprite } from 'pixi.js'
import type { Application, Container } from 'pixi.js'
import type { GraphEdge } from '@/types'
import type {
  SimulationNode,
  SimulationLink,
  EdgeLabelObjects,
  NodeLabelObjects,
  HighlightState,
  ForceSettings,
} from '../types/graph.types'
import type { ItemType } from '@/stores/node-display-settings'
import { textureCache } from '../utils/texture-cache'
import {
  shouldShowEdgeLabels,
  shouldShowNodeIcons,
  shouldShowNodeLabels,
} from '../utils/visibility-calculator'
import { selectLabelsWithDeclutteringFast } from '../utils/label-decluttering'
import { renderNode, updateIconSprite, calculateNodeSize } from '../renderers/node-renderer'
import { renderEdges } from '../renderers/edge-renderer'
import {
  updateNodeLabel,
  updateEdgeLabel,
  createNodeLabel,
  createEdgeLabel,
} from '../renderers/label-renderer'

interface UseGraphRendererProps {
  app: Application | null
  containers: {
    linkContainer: Container
    edgeLabelContainer: Container
    nodeContainer: Container
    labelContainer: Container
  } | null
  simulationNodes: SimulationNode[]
  simulationLinks: SimulationLink[]
  edges: GraphEdge[]
  selectedNodeIds: Set<string>
  hoveredNodeId: string | null
  highlightState: HighlightState
  forceSettings: ForceSettings
  showIcons: boolean
  showLabels: boolean
  onNodeHover: (node: SimulationNode) => void
  onNodeLeave: () => void
  createNodePointerDownHandler: (node: SimulationNode, nodeGfx: Graphics, stage: any) => any
  createNodeRightClickHandler: (node: SimulationNode) => any
}

/**
 * Main rendering hook that orchestrates all rendering logic
 *
 * @param props - Renderer configuration
 * @returns Zoom change callback
 */
export function useGraphRenderer({
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
  onNodeHover,
  onNodeLeave,
  createNodePointerDownHandler,
  createNodeRightClickHandler,
}: UseGraphRendererProps) {
  const nodeGraphicsMapRef = useRef(new Map<string, Graphics>())
  const nodeLabelMapRef = useRef(new Map<string, NodeLabelObjects>())
  const nodeIconMapRef = useRef(new Map<string, Sprite>())
  const edgeLabelMapRef = useRef(new Map<string, EdgeLabelObjects>())
  const linkGraphicsRef = useRef<Graphics | null>(null)

  const [visibleLabels, setVisibleLabels] = useState<Set<string>>(new Set())
  const [currentZoom, setCurrentZoom] = useState(1)
  const animationFrameRef = useRef<number | null>(null)
  const stopAnimationRef = useRef(false)
  const lastLabelUpdateRef = useRef<number>(0)
  const isZoomingRef = useRef(false)
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // LOD state (derived from zoom)
  const showIconsLOD = shouldShowNodeIcons(currentZoom)
  const showLabelsLOD = shouldShowNodeLabels(currentZoom)
  const showEdgeLabelsLOD = shouldShowEdgeLabels(currentZoom)

  /**
   * Handle zoom change with throttling
   * PERFORMANCE: Throttle label recalculation and detect zooming state
   */
  const handleZoomChange = useCallback((zoomLevel: number) => {
    setCurrentZoom(zoomLevel)

    // Mark as zooming
    isZoomingRef.current = true

    // Clear previous timeout
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current)
    }

    // Mark zoom as finished after 300ms of no zoom changes
    zoomTimeoutRef.current = setTimeout(() => {
      isZoomingRef.current = false
    }, 300)

    // Throttle label recalculation (max once every 200ms)
    const now = Date.now()
    if (now - lastLabelUpdateRef.current > 200) {
      lastLabelUpdateRef.current = now

      // Recalculate visible labels with decluttering
      if (app && app.renderer && app.stage) {
        const viewport = app.renderer
        const stage = app.stage

        const visibleLabels = selectLabelsWithDeclutteringFast(
          simulationNodes,
          forceSettings.nodeSize.value,
          zoomLevel,
          forceSettings.nodeLabelFontSize?.value ?? 50,
          viewport.width,
          viewport.height,
          -stage.position.x / stage.scale.x,
          -stage.position.y / stage.scale.y,
          selectedNodeIds,
          highlightState.nodes
        )
        setVisibleLabels(visibleLabels)
      }
    }
  }, [simulationNodes, app, forceSettings, selectedNodeIds, highlightState.nodes])

  /**
   * Initialize rendering objects (nodes, labels, icons, etc.)
   */
  useEffect(() => {
    if (!containers || !app) return

    const { linkContainer, edgeLabelContainer, nodeContainer, labelContainer } = containers

    // Clear existing objects
    nodeGraphicsMapRef.current.clear()
    nodeLabelMapRef.current.clear()
    nodeIconMapRef.current.clear()
    edgeLabelMapRef.current.clear()
    linkContainer.removeChildren()
    edgeLabelContainer.removeChildren()
    nodeContainer.removeChildren()
    labelContainer.removeChildren()

    // Create link graphics
    const linkGraphics = new Graphics()
    linkContainer.addChild(linkGraphics)
    linkGraphicsRef.current = linkGraphics

    // Preload icons
    const loadIcons = async () => {
      if (showIcons) {
        const iconTypes = new Set<ItemType>()
        simulationNodes.forEach((node) => {
          if (node.data?.type) {
            iconTypes.add(node.data.type as ItemType)
          }
        })
        await textureCache.preloadBatch(Array.from(iconTypes))
      }

      // Create node graphics, labels, and icons
      simulationNodes.forEach((node) => {
        // Create node graphics
        const nodeGfx: Graphics = new Graphics({
          interactive: true,
          eventMode: 'static',
          cursor: 'pointer',
        })

        // Attach event handlers
        nodeGfx
          .on('pointerover', () => onNodeHover(node))
          .on('pointerleave', () => onNodeLeave())
          .on('pointerdown', createNodePointerDownHandler(node, nodeGfx, app.stage))
          .on('rightclick', createNodeRightClickHandler(node))

        nodeContainer.addChild(nodeGfx)
        nodeGraphicsMapRef.current.set(node.id, nodeGfx)

        // Create icon sprite if needed (only if showIcons is enabled globally)
        // Note: Icons will be hidden/shown based on zoom level in the render loop
        if (showIcons && node.data?.type) {
          const nodeType = node.data.type as ItemType
          const cachedTexture = textureCache.get(nodeType)
          if (cachedTexture) {
            const iconSprite = new Sprite(cachedTexture)
            iconSprite.anchor.set(0.5)
            iconSprite.eventMode = 'none'
            iconSprite.roundPixels = false
            iconSprite.visible = false // Start hidden, will be shown based on LOD
            if (cachedTexture.source) {
              cachedTexture.source.scaleMode = 'linear'
            }
            nodeContainer.addChild(iconSprite)
            nodeIconMapRef.current.set(node.id, iconSprite)
          }
        }

        // Create node label with background
        const labelText = node.data?.label || node.id
        const labelObjects = createNodeLabel(labelText)
        // Add background first (so it renders behind the text)
        labelContainer.addChild(labelObjects.background)
        labelContainer.addChild(labelObjects.text)
        nodeLabelMapRef.current.set(node.id, labelObjects)
      })

      // Create edge labels
      if (showLabels) {
        edges.forEach((edge) => {
          if (edge.label) {
            const edgeKey = `${edge.source}-${edge.target}`
            const edgeLabel = createEdgeLabel(edge.label)
            edgeLabelContainer.addChild(edgeLabel.background)
            edgeLabelContainer.addChild(edgeLabel.text)
            edgeLabelMapRef.current.set(edgeKey, edgeLabel)
          }
        })
      }

      // Initialize visible labels with decluttering
      if (app && app.renderer && app.stage) {
        const viewport = app.renderer
        const stage = app.stage

        const initialVisibleLabels = selectLabelsWithDeclutteringFast(
          simulationNodes,
          forceSettings.nodeSize.value,
          1, // Initial zoom level
          forceSettings.nodeLabelFontSize?.value ?? 50,
          viewport.width,
          viewport.height,
          -stage.position.x / stage.scale.x,
          -stage.position.y / stage.scale.y,
          new Set(), // No selected nodes initially
          new Set() // No highlighted nodes initially
        )
        setVisibleLabels(initialVisibleLabels)
      }
    }

    loadIcons()
  }, [
    app,
    containers,
    simulationNodes,
    edges,
    showIcons,
    showLabels,
    forceSettings,
    onNodeHover,
    onNodeLeave,
    createNodePointerDownHandler,
    createNodeRightClickHandler,
  ])

  /**
   * Animation loop
   */
  useEffect(() => {
    if (!app || !containers) return

    stopAnimationRef.current = false

    const animate = () => {
      if (stopAnimationRef.current || !app || !app.stage || app.stage.destroyed) return

      const linkGraphics = linkGraphicsRef.current
      if (!linkGraphics) return

      const hasAnyHighlight = highlightState.nodes.size > 0 || highlightState.links.size > 0

      // Render edges
      const linkWidth = forceSettings?.linkWidth?.value ?? 2
      renderEdges(linkGraphics, simulationLinks, highlightState.links, linkWidth)

      // Render edge labels (only if LOD allows AND nodes are active)
      // PERFORMANCE: Skip edge labels during zoom
      if (isZoomingRef.current || !showLabels || !showEdgeLabelsLOD) {
        // Hide all edge labels during zoom or if LOD doesn't allow
        edgeLabelMapRef.current.forEach((edgeLabel) => {
          edgeLabel.text.visible = false
          edgeLabel.background.visible = false
        })
      } else {
        simulationLinks.forEach((link) => {
          const source = link.source as SimulationNode
          const target = link.target as SimulationNode
          const linkKey = `${source.id}-${target.id}`
          const edgeLabel = edgeLabelMapRef.current.get(linkKey)

          if (edgeLabel) {
            // Show edge label only if at least one of its nodes is active
            const sourceActive =
              highlightState.nodes.has(source.id) || selectedNodeIds.has(source.id)
            const targetActive =
              highlightState.nodes.has(target.id) || selectedNodeIds.has(target.id)
            const shouldShowEdgeLabel = sourceActive || targetActive

            if (shouldShowEdgeLabel) {
              const isHighlighted = highlightState.links.has(linkKey)
              updateEdgeLabel(edgeLabel, link, currentZoom, isHighlighted, hasAnyHighlight)
            } else {
              // Hide edge label if nodes are not active
              edgeLabel.text.visible = false
              edgeLabel.background.visible = false
            }
          }
        })
      }

      // Render nodes
      // PERFORMANCE: Limit labels per frame to prevent lag
      let renderedLabelCount = 0
      const MAX_LABELS_PER_FRAME = 100

      simulationNodes.forEach((node) => {
        const nodeGfx = nodeGraphicsMapRef.current.get(node.id)
        if (!nodeGfx) return

        const nodeSize = calculateNodeSize(node, forceSettings.nodeSize.value)
        const isHovered = hoveredNodeId === node.id
        const isHighlighted = highlightState.nodes.has(node.id)
        const isSelected = selectedNodeIds.has(node.id)

        // Render node
        renderNode(
          nodeGfx,
          node,
          nodeSize,
          isHovered,
          isHighlighted,
          isSelected,
          hasAnyHighlight
        )

        // Update icon (only if LOD allows)
        if (showIcons && showIconsLOD) {
          const iconSprite = nodeIconMapRef.current.get(node.id)
          if (iconSprite) {
            iconSprite.visible = true
            updateIconSprite(iconSprite, node, nodeSize, isHighlighted, hasAnyHighlight)
          }
        } else if (showIcons) {
          // Hide icons if LOD doesn't allow them
          const iconSprite = nodeIconMapRef.current.get(node.id)
          if (iconSprite) {
            iconSprite.visible = false
          }
        }

        // Update label (only if LOD allows)
        const labelObjects = nodeLabelMapRef.current.get(node.id)
        if (labelObjects) {
          // PERFORMANCE: Skip label rendering during active zoom
          if (isZoomingRef.current) {
            labelObjects.text.visible = false
            labelObjects.background.visible = false
            return
          }

          // PERFORMANCE: Limit total labels rendered per frame
          const shouldShowBySelection = visibleLabels.has(node.id) || isHighlighted || isSelected
          const shouldShow = showLabelsLOD && shouldShowBySelection && renderedLabelCount < MAX_LABELS_PER_FRAME

          if (shouldShow) {
            renderedLabelCount++
          }

          const fontSizeSetting = forceSettings?.nodeLabelFontSize?.value ?? 50
          updateNodeLabel(
            labelObjects,
            node,
            nodeSize,
            shouldShow,
            currentZoom,
            fontSizeSetting,
            isHighlighted,
            hasAnyHighlight
          )
        }
      })

      // Render
      try {
        app.renderer.render(app.stage)
      } catch (error) {
        console.error('Render error:', error)
        stopAnimationRef.current = true
        return
      }

      // Continue animation
      if (!stopAnimationRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      stopAnimationRef.current = true
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [
    app,
    containers,
    simulationNodes,
    simulationLinks,
    selectedNodeIds,
    hoveredNodeId,
    highlightState,
    forceSettings,
    showIcons,
    showLabels,
    currentZoom,
    visibleLabels,
  ])

  return { handleZoomChange }
}
