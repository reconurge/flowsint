import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebounce } from './use-debounce'
import { sketchService } from '@/api/sketch-service'
import { useGraphSaveStatus } from '@/stores/graph-save-status-store'
import { useGraphStore } from '@/stores/graph-store'

interface NodePosition {
  x: number
  y: number
}

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

/**
 * Hook to save node positions to the backend
 * Handles debouncing and batch updates for all nodes
 */
export function useSaveNodePositions(sketchId?: string) {
  const [changedNodePositions, setChangedNodePositions] = useState<Map<string, NodePosition>>(new Map())
  const setNodes = useGraphStore(s => s.setNodes)
  const isStabilizingRef = useRef(false) // Start as false, mark as true only during layout regeneration
  const setSaveStatus = useGraphSaveStatus((state) => state.setSaveStatus)

  // Debounced value to trigger save (2 seconds)
  const debouncedChangedPositions = useDebounce(changedNodePositions, 1200)

  // Initialize status on mount
  useEffect(() => {
    setSaveStatus('idle')
  }, [setSaveStatus])

  /**
   * Mark the graph as stabilized (can start saving positions)
   */
  const markAsStabilized = useCallback(() => {
    isStabilizingRef.current = false
  }, [])

  /**
   * Mark the graph as stabilizing (prevent saving positions)
   */
  const markAsStabilizing = useCallback(() => {
    isStabilizingRef.current = true
  }, [])

  /**
   * Save positions for all nodes
   * @param nodes - Array of nodes or graphData.nodes
   * @param force - Force save even if stabilizing (for layout regeneration)
   */
  const saveAllNodePositions = useCallback((nodes: any[], force = false) => {
    if (!sketchId) {
      return
    }

    if (!force && isStabilizingRef.current) {
      return
    }

    const newMap = new Map<string, NodePosition>()

    nodes.forEach((node: any) => {
      if (node.x !== undefined && node.y !== undefined) {
        // Fix node position to prevent force simulation from moving it
        node.fx = node.x
        node.fy = node.y
        newMap.set(node.id, { x: node.x, y: node.y })
      }
    })

    if (newMap.size > 0) {
      setChangedNodePositions(newMap)
      setNodes(nodes)
      setSaveStatus('pending')
    }
  }, [sketchId])

  /**
   * Clear pending changes (useful when switching sketches)
   */
  const clearPendingChanges = useCallback(() => {
    setChangedNodePositions(new Map())
  }, [])

  // Save positions when debounced value changes
  useEffect(() => {
    if (!sketchId || debouncedChangedPositions.size === 0) {
      return
    }

    const positions = Array.from(debouncedChangedPositions.entries()).map(([nodeId, pos]) => ({
      nodeId,
      x: pos.x,
      y: pos.y
    }))

    setSaveStatus('saving')

    sketchService.updateNodePositions(sketchId, positions)
      .then(() => {
        setChangedNodePositions(new Map())
        setSaveStatus('saved')
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000)
      })
      .catch((error) => {
        console.error('[useSaveNodePositions] Failed to save:', error)
        setSaveStatus('error')
        // Reset to idle after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000)
      })
  }, [debouncedChangedPositions, sketchId, setSaveStatus])

  return {
    saveAllNodePositions,
    markAsStabilized,
    markAsStabilizing,
    clearPendingChanges,
    hasPendingChanges: changedNodePositions.size > 0
  }
}
