import { useState, useCallback, useRef, useEffect } from 'react'
import type { LinkObject } from 'react-force-graph-2d'
import type { GraphNode } from '@/types'

// LinkObject's own source/target type — `string | number | NodeObject` — is
// the library's real duality: a plain edge's source/target starts as an id
// and gets mutated into the actual node object once it's resolved the
// graph, and callers see whichever form depending on timing. Same duality
// already reflected on GraphNode.links in types/graph.ts.
type LinkEndpoint = LinkObject['source']

// App ids are always strings (GraphNode.id: string) — coerce the library's
// string|number id here rather than leaking a number through to callers
// that only ever deal in string ids.
const linkEndpointId = (endpoint: LinkEndpoint): string | undefined => {
  const id = typeof endpoint === 'object' ? endpoint?.id : endpoint
  return id === undefined ? undefined : String(id)
}

export const useHighlightState = () => {
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set())
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set())
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const hoverFrameRef = useRef<number | null>(null)

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    if (hoverFrameRef.current) {
      cancelAnimationFrame(hoverFrameRef.current)
    }

    hoverFrameRef.current = requestAnimationFrame(() => {
      const newHighlightNodes = new Set<string>()
      const newHighlightLinks = new Set<string>()

      if (node) {
        newHighlightNodes.add(node.id)
        if (node.neighbors) {
          node.neighbors.forEach((neighbor) => {
            newHighlightNodes.add(neighbor.id)
          })
        }
        if (node.links) {
          node.links.forEach((link) => {
            newHighlightLinks.add(`${linkEndpointId(link.source)}-${linkEndpointId(link.target)}`)
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

  const handleLinkHover = useCallback((link: LinkObject | null) => {
    if (hoverFrameRef.current) {
      cancelAnimationFrame(hoverFrameRef.current)
    }

    hoverFrameRef.current = requestAnimationFrame(() => {
      const newHighlightNodes = new Set<string>()
      const newHighlightLinks = new Set<string>()

      if (link) {
        const sourceId = linkEndpointId(link.source)
        const targetId = linkEndpointId(link.target)
        newHighlightLinks.add(`${sourceId}-${targetId}`)
        if (sourceId !== undefined) newHighlightNodes.add(sourceId)
        if (targetId !== undefined) newHighlightNodes.add(targetId)
      }

      setHoverNode(null)
      setHighlightNodes(newHighlightNodes)
      setHighlightLinks(newHighlightLinks)
      hoverFrameRef.current = null
    })
  }, [])

  const clearHighlights = useCallback(() => {
    setHighlightNodes(new Set())
    setHighlightLinks(new Set())
    setHoverNode(null)
  }, [])

  useEffect(() => {
    return () => {
      if (hoverFrameRef.current) {
        cancelAnimationFrame(hoverFrameRef.current)
      }
    }
  }, [])

  return {
    highlightNodes,
    highlightLinks,
    hoverNode,
    handleNodeHover,
    handleLinkHover,
    clearHighlights
  }
}
