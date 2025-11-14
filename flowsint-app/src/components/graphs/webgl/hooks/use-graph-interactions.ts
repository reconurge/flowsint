import { useCallback, useRef, useState } from 'react'
import { Graphics, FederatedPointerEvent } from 'pixi.js'
import { GRAPH_CONSTANTS } from '../constants'
import type { SimulationNode, HighlightState, TransformState } from '../types/graph.types'
import type { Simulation } from 'd3-force'
import type { GraphNode } from '@/types'

interface UseGraphInteractionsProps {
  simulation: Simulation<SimulationNode, any> | null
  onNodeClick?: (node: GraphNode, event: MouseEvent) => void
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void
  onBackgroundClick?: () => void
}

/**
 * Hook to manage graph interactions (hover, click, drag)
 *
 * @param props - Interaction configuration
 * @returns Interaction state and handlers
 */
export function useGraphInteractions({
  simulation,
  onNodeClick,
  onNodeRightClick,
  onBackgroundClick,
}: UseGraphInteractionsProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [highlightState, setHighlightState] = useState<HighlightState>({
    nodes: new Set(),
    links: new Set(),
  })
  const [isDragging, setIsDragging] = useState(false)

  const transformRef = useRef<TransformState>({ k: 1, x: 0, y: 0 })
  const nodeWasClickedRef = useRef(false)

  /**
   * Handle node hover
   */
  const handleNodeHover = useCallback((node: SimulationNode) => {
    setHoveredNodeId(node.id)

    const nodes = new Set<string>([node.id])
    const links = new Set<string>()

    // Add neighbors
    node.neighbors.forEach((neighbor) => {
      nodes.add(neighbor.id)
    })

    // Add connected links
    node.links.forEach((link: any) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source
      const targetId = typeof link.target === 'object' ? link.target.id : link.target
      links.add(`${sourceId}-${targetId}`)
    })

    setHighlightState({ nodes, links })
  }, [])

  /**
   * Handle node hover leave
   */
  const handleNodeLeave = useCallback(() => {
    setHoveredNodeId(null)
    setHighlightState({ nodes: new Set(), links: new Set() })
  }, [])

  /**
   * Create pointer down handler for a node
   */
  const createNodePointerDownHandler = useCallback(
    (node: SimulationNode, nodeGfx: Graphics, stage: any) => {
      return (event: FederatedPointerEvent) => {
        event.stopPropagation()
        setIsDragging(true)

        const dragStartPos = event.global.clone()
        node.fx = node.x
        node.fy = node.y
        simulation?.alphaTarget(GRAPH_CONSTANTS.FORCE_ALPHA_TARGET_DRAG).restart()
        nodeGfx.cursor = 'grabbing'

        let lastPos = event.global.clone()

        const onMove = (e: FederatedPointerEvent) => {
          const newPos = e.global
          const dx = (newPos.x - lastPos.x) / transformRef.current.k
          const dy = (newPos.y - lastPos.y) / transformRef.current.k
          node.fx = (node.fx || node.x!) + dx
          node.fy = (node.fy || node.y!) + dy
          lastPos = newPos.clone()
        }

        const onUp = (e: FederatedPointerEvent) => {
          const distance = Math.hypot(
            e.global.x - dragStartPos.x,
            e.global.y - dragStartPos.y
          )

          setIsDragging(false)
          node.fx = null
          node.fy = null
          simulation?.alphaTarget(0)
          nodeGfx.cursor = 'pointer'

          stage.off('pointermove', onMove)
          stage.off('pointerup', onUp)
          stage.off('pointerupoutside', onUp)

          // Trigger click if drag distance is small
          if (distance < GRAPH_CONSTANTS.CLICK_DISTANCE_THRESHOLD) {
            nodeWasClickedRef.current = true
            const mouseEvent = new MouseEvent('click', {
              ctrlKey: e.ctrlKey,
              shiftKey: e.shiftKey,
              metaKey: e.metaKey,
            })
            onNodeClick?.(node, mouseEvent)
          }

          handleNodeLeave()
        }

        stage.on('pointermove', onMove)
        stage.on('pointerup', onUp)
        stage.on('pointerupoutside', onUp)
      }
    },
    [simulation, onNodeClick, handleNodeLeave]
  )

  /**
   * Create right click handler for a node
   */
  const createNodeRightClickHandler = useCallback(
    (node: SimulationNode) => {
      return (event: FederatedPointerEvent) => {
        if (onNodeRightClick) {
          event.stopPropagation()
          const mouseEvent = new MouseEvent('contextmenu', {
            clientX: event.global.x,
            clientY: event.global.y,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
          })
          onNodeRightClick(node, mouseEvent)
        }
      }
    },
    [onNodeRightClick]
  )

  /**
   * Handle background click
   */
  const handleBackgroundClick = useCallback(() => {
    if (!nodeWasClickedRef.current && onBackgroundClick) {
      onBackgroundClick()
    }
    nodeWasClickedRef.current = false
  }, [onBackgroundClick])

  /**
   * Update transform reference (for drag calculations)
   */
  const updateTransform = useCallback((transform: TransformState) => {
    transformRef.current = transform
  }, [])

  return {
    hoveredNodeId,
    highlightState,
    isDragging,
    handleNodeHover,
    handleNodeLeave,
    createNodePointerDownHandler,
    createNodeRightClickHandler,
    handleBackgroundClick,
    updateTransform,
  }
}
