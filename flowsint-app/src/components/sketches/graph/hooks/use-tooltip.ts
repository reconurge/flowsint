import { useState, useCallback } from 'react'
import { TooltipState } from '../utils/types'

export const useTooltip = (graphRef: React.RefObject<any>) => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    x: 0,
    y: 0,
    data: null,
    visible: false
  })

  const showTooltip = useCallback(
    (node: any) => {
      if (!node || !graphRef.current) {
        setTooltip((prev) => ({ ...prev, visible: false }))
        return
      }

      const weight = node.neighbors?.length || 0
      const label = node.nodeLabel || node.label || node.id

      try {
        const screenCoords = graphRef.current.graph2ScreenCoords(node.x, node.y)
        const tooltipWidth = 120
        const tooltipHeight = 60

        let x = screenCoords.x
        let y = screenCoords.y - 30

        if (x + tooltipWidth > window.innerWidth) {
          x = window.innerWidth - tooltipWidth - 10
        }
        if (x < 10) {
          x = 10
        }
        if (y < tooltipHeight + 10) {
          y = screenCoords.y + 100
        }

        setTooltip({
          x,
          y,
          data: {
            label,
            type: node.nodeType || 'unknown',
            connections: weight.toString()
          },
          visible: true
        })
      } catch (error) {
        setTooltip((prev) => ({ ...prev, visible: false }))
      }
    },
    [graphRef]
  )

  const hideTooltip = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }))
  }, [])

  return {
    tooltip,
    showTooltip,
    hideTooltip
  }
}
