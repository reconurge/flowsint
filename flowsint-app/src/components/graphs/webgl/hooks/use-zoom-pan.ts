import { useEffect, useCallback, useRef } from 'react'
// @ts-ignore - d3 types may not be available
import { select, zoom, zoomIdentity, ZoomBehavior } from 'd3'
import { GRAPH_CONSTANTS } from '../constants'
import type { Application, Container } from 'pixi.js'
import type { SimulationNode, TransformState } from '../types/graph.types'

interface UseZoomPanProps {
  app: Application | null
  stage: Container | null
  width: number
  height: number
  isDragging: boolean
  simulationNodes: SimulationNode[]
  onTransformChange: (transform: TransformState) => void
  onZoomChange: (zoomLevel: number) => void
}

/**
 * Hook to manage zoom and pan behavior
 *
 * @param props - Zoom/pan configuration
 * @returns Zoom control functions
 */
export function useZoomPan({
  app,
  stage,
  width,
  height,
  isDragging,
  simulationNodes,
  onTransformChange,
  onZoomChange,
}: UseZoomPanProps) {
  const zoomBehaviorRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null)
  const canvasSelectionRef = useRef<any>(null)
  const currentTransformRef = useRef<TransformState>({ k: 1, x: 0, y: 0 })

  useEffect(() => {
    if (!app || !stage) return

    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .extent([
        [0, 0],
        [width, height],
      ])
      .scaleExtent([GRAPH_CONSTANTS.MIN_ZOOM, GRAPH_CONSTANTS.MAX_ZOOM])
      .filter(() => !isDragging) // Don't zoom/pan while dragging nodes
      .on('zoom', (event: any) => {
        const { transform } = event
        currentTransformRef.current = transform
        stage.scale.set(transform.k, transform.k)
        stage.position.set(transform.x, transform.y)
        onTransformChange(transform)
        onZoomChange(transform.k)
      })

    const canvasSelection = select<HTMLCanvasElement, unknown>(app.canvas)
    canvasSelection.call(zoomBehavior)

    zoomBehaviorRef.current = zoomBehavior
    canvasSelectionRef.current = canvasSelection

    return () => {
      canvasSelection.on('.zoom', null)
      zoomBehaviorRef.current = null
      canvasSelectionRef.current = null
    }
  }, [app, stage, width, height, isDragging, onTransformChange, onZoomChange])

  /**
   * Zoom in
   */
  const zoomIn = useCallback(() => {
    if (!canvasSelectionRef.current || !zoomBehaviorRef.current) return

    const currentZoom = currentTransformRef.current.k
    const newZoom = Math.min(
      currentZoom * GRAPH_CONSTANTS.ZOOM_IN_FACTOR,
      GRAPH_CONSTANTS.MAX_ZOOM
    )

    canvasSelectionRef.current
      .transition()
      .duration(GRAPH_CONSTANTS.ZOOM_TRANSITION_DURATION)
      .call(zoomBehaviorRef.current.scaleTo, newZoom)
  }, [])

  /**
   * Zoom out
   */
  const zoomOut = useCallback(() => {
    if (!canvasSelectionRef.current || !zoomBehaviorRef.current) return

    const currentZoom = currentTransformRef.current.k
    const newZoom = Math.max(
      currentZoom * GRAPH_CONSTANTS.ZOOM_OUT_FACTOR,
      GRAPH_CONSTANTS.MIN_ZOOM
    )

    canvasSelectionRef.current
      .transition()
      .duration(GRAPH_CONSTANTS.ZOOM_TRANSITION_DURATION)
      .call(zoomBehaviorRef.current.scaleTo, newZoom)
  }, [])

  /**
   * Zoom to fit all nodes
   */
  const zoomToFit = useCallback(() => {
    if (!canvasSelectionRef.current || !zoomBehaviorRef.current) return

    // Calculate bounding box
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    simulationNodes.forEach((node) => {
      if (node.x && node.y) {
        minX = Math.min(minX, node.x)
        minY = Math.min(minY, node.y)
        maxX = Math.max(maxX, node.x)
        maxY = Math.max(maxY, node.y)
      }
    })

    if (minX === Infinity) return // No nodes

    // Add padding
    const padding = GRAPH_CONSTANTS.ZOOM_FIT_PADDING
    const graphWidth = maxX - minX + padding * 2
    const graphHeight = maxY - minY + padding * 2

    // Calculate scale to fit
    const scaleX = width / graphWidth
    const scaleY = height / graphHeight
    const scale = Math.min(scaleX, scaleY, GRAPH_CONSTANTS.MAX_ZOOM)

    // Calculate center
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // Calculate translation to center
    const translateX = width / 2 - centerX * scale
    const translateY = height / 2 - centerY * scale

    // Apply transformation
    canvasSelectionRef.current
      .transition()
      .duration(GRAPH_CONSTANTS.ZOOM_FIT_DURATION)
      .call(
        zoomBehaviorRef.current.transform,
        zoomIdentity.translate(translateX, translateY).scale(scale)
      )
  }, [width, height, simulationNodes])

  return {
    zoomIn,
    zoomOut,
    zoomToFit,
  }
}
