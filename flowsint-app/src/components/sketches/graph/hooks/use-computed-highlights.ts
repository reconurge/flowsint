import { useMemo } from 'react'
import type { GraphEdge } from '@/types'

export const useComputedHighlights = (highlightedNodeIds: string[], edges: GraphEdge[]) => {
  const highlightNodes = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds])

  const highlightLinks = useMemo(() => {
    const links = new Set<string>()
    const nodeIdSet = new Set(highlightedNodeIds)

    edges.forEach((edge) => {
      const sourceId = edge.source
      const targetId = edge.target

      // Only highlight links where BOTH nodes are highlighted
      if (nodeIdSet.has(sourceId) && nodeIdSet.has(targetId)) {
        links.add(`${sourceId}-${targetId}`)
      }
    })

    return links
  }, [highlightedNodeIds, edges])

  return { highlightNodes, highlightLinks }
}
