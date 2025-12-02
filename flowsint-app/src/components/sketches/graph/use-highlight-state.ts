import { useState, useCallback, useRef, useEffect } from 'react'

export const useHighlightState = () => {
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set())
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set())
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const hoverFrameRef = useRef<number | null>(null)

  const handleNodeHover = useCallback((node: any) => {
    if (hoverFrameRef.current) {
      cancelAnimationFrame(hoverFrameRef.current)
    }

    hoverFrameRef.current = requestAnimationFrame(() => {
      const newHighlightNodes = new Set<string>()
      const newHighlightLinks = new Set<string>()

      if (node) {
        newHighlightNodes.add(node.id)
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

  const handleLinkHover = useCallback((link: any) => {
    if (hoverFrameRef.current) {
      cancelAnimationFrame(hoverFrameRef.current)
    }

    hoverFrameRef.current = requestAnimationFrame(() => {
      const newHighlightNodes = new Set<string>()
      const newHighlightLinks = new Set<string>()

      if (link) {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source
        const targetId = typeof link.target === 'object' ? link.target.id : link.target
        newHighlightLinks.add(`${sourceId}-${targetId}`)
        newHighlightNodes.add(sourceId)
        newHighlightNodes.add(targetId)
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
