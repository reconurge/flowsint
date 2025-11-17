import { useCallback } from 'react'
import { getDagreLayoutedElements, getForceLayoutedElements } from '@/lib/utils'
import { GraphNode, GraphEdge } from '@/types'

interface UseLayoutProps {
  forceSettings: any
  containerSize: { width: number; height: number }
  saveAllNodePositions: (nodes: any[], force?: boolean) => void
}

interface LayoutOptions {
  layoutType: 'force' | 'hierarchy'
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function useLayout({
  forceSettings,
  containerSize,
  saveAllNodePositions,
}: UseLayoutProps) {
  const applyLayout = useCallback(
    ({ layoutType, nodes, edges }: LayoutOptions) => {
      // Remove fx and fy from all nodes to allow repositioning
      nodes.forEach((node: any) => {
        delete node.fx
        delete node.fy
      })

      if (layoutType === 'hierarchy') {
        // Apply dagre layout for hierarchical positioning
        const { nodes: layoutedNodes } = getDagreLayoutedElements(nodes, edges, {
          dagLevelDistance: forceSettings.dagLevelDistance?.value ?? 50,
        })

        // Apply the calculated positions to the graph nodes
        layoutedNodes.forEach((layoutedNode: any) => {
          const graphNode = nodes.find((n: any) => n.id === layoutedNode.id) as any
          if (graphNode && layoutedNode.x !== undefined && layoutedNode.y !== undefined) {
            graphNode.x = layoutedNode.x
            graphNode.y = layoutedNode.y
            graphNode.fx = layoutedNode.x
            graphNode.fy = layoutedNode.y
          }
        })

        // Save all node positions immediately after hierarchy layout
        saveAllNodePositions(nodes, true)
      } else {
        // Force layout: calculate positions using D3-force
        const { nodes: layoutedNodes } = getForceLayoutedElements(nodes, edges, {
          width: containerSize.width || 800,
          height: containerSize.height || 600,
          chargeStrength: forceSettings.d3ForceChargeStrength?.value ?? -30,
          linkDistance: forceSettings.d3ForceLinkDistance?.value ?? 30,
          linkStrength: forceSettings.d3ForceLinkStrength?.value ?? 2,
          alphaDecay: forceSettings.d3AlphaDecay?.value ?? 0.045,
          alphaMin: forceSettings.d3AlphaMin?.value ?? 0,
          velocityDecay: forceSettings.d3VelocityDecay?.value ?? 0.41,
          iterations: forceSettings.cooldownTicks?.value ?? 300,
        })

        // Apply the calculated positions to the graph nodes
        layoutedNodes.forEach((layoutedNode: any) => {
          const graphNode = nodes.find((n: any) => n.id === layoutedNode.id) as any
          if (graphNode && layoutedNode.x !== undefined && layoutedNode.y !== undefined) {
            graphNode.x = layoutedNode.x
            graphNode.y = layoutedNode.y
            graphNode.fx = layoutedNode.x
            graphNode.fy = layoutedNode.y
          }
        })

        // Save all node positions immediately after force layout
        saveAllNodePositions(nodes, true)
      }

      return nodes
    },
    [forceSettings, containerSize, saveAllNodePositions]
  )

  return { applyLayout }
}
