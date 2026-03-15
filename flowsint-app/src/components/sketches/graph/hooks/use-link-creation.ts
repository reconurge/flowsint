import { useCallback, useRef, useState } from 'react'
import { useGraphStore } from '@/stores/graph-store'
import { sketchService } from '@/api/sketch-service'
import { toast } from 'sonner'
import { type GraphNode, type GraphEdge } from '@/types'
import { useKeyboard } from '@/hooks/use-keyboard'

type LinkCreationMode = 'idle' | 'linking'

interface LinkCreationState {
  mode: LinkCreationMode
  sourceNode: GraphNode | null
}

const INITIAL_STATE: LinkCreationState = {
  mode: 'idle',
  sourceNode: null
}

export const useLinkCreation = (sketchId?: string) => {
  const [state, setState] = useState<LinkCreationState>(INITIAL_STATE)
  const stateRef = useRef(state)
  stateRef.current = state

  const [shiftHeld, setShiftHeld] = useState(false)

  const addEdge = useGraphStore((s) => s.addEdge)
  const removeEdges = useGraphStore((s) => s.removeEdges)

  useKeyboard(
    'Alt',
    useCallback(() => setShiftHeld(true), []),
    useCallback(() => {
      setShiftHeld(false)
      if (stateRef.current.mode === 'linking') {
        setState(INITIAL_STATE)
      }
    }, [])
  )

  const cancel = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  const startLinking = useCallback((node: GraphNode) => {
    setState({ mode: 'linking', sourceNode: node })
  }, [])

  // Creates the edge in store only (not persisted yet) and returns it
  const completeLinking = useCallback(
    (targetNode: GraphNode): GraphEdge | null => {
      const current = stateRef.current
      if (!current.sourceNode || targetNode.id === current.sourceNode.id) {
        setState(INITIAL_STATE)
        return null
      }

      const newEdge = addEdge({
        label: 'IS_RELATED_TO',
        type: 'one-way',
        source: current.sourceNode.id,
        target: targetNode.id
      })

      setState(INITIAL_STATE)
      return newEdge
    },
    [addEdge]
  )

  // Called by edge context menu on Enter/submit — persist to API
  const submitNewEdge = useCallback(
    (edgeId: string, label: string) => {
      if (!sketchId) return
      const edge = useGraphStore.getState().edgesMapping.get(edgeId)
      if (!edge) return

      const edgeData = {
        label,
        type: 'one-way',
        source: edge.source,
        target: edge.target
      }
      toast.promise(sketchService.addEdge(sketchId, JSON.stringify(edgeData)), {
        loading: 'Creating relation...',
        success: 'Relation added.',
        error: 'Failed to create relation.'
      })
    },
    [sketchId]
  )

  // Called when edge context menu is dismissed without saving — remove from store
  const dismissNewEdge = useCallback(
    (edgeId: string) => {
      removeEdges([edgeId])
    },
    [removeEdges]
  )

  return {
    linkCreation: state,
    shiftHeld,
    startLinking,
    completeLinking,
    cancelLinkCreation: cancel,
    submitNewEdge,
    dismissNewEdge
  }
}
