import { useEffect, useRef, useState } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCenter, Simulation } from 'd3-force'
import { GRAPH_CONSTANTS } from '../constants'
import type { GraphNode, GraphEdge } from '@/types'
import type { SimulationNode, SimulationLink, LayoutMode } from '../types/graph.types'
import type { ItemType } from '@/stores/node-display-settings'
import { getDagreLayoutedElements } from '@/lib/utils'

interface UseForceSimulationProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
  nodeColors: Record<ItemType, string>
  layoutMode: LayoutMode
}

/**
 * Hook to manage D3 force simulation or static layouts
 *
 * Supports three layout modes:
 * - 'none': Static grid layout, no physics
 * - 'force': D3 force-directed layout with physics
 * - 'dagre': Hierarchical layout using Dagre algorithm
 *
 * @param props - Simulation configuration
 * @returns Simulation nodes, links, and simulation control
 */
export function useForceSimulation({
  nodes,
  edges,
  width,
  height,
  nodeColors,
  layoutMode,
}: UseForceSimulationProps) {
  const [simulationNodes, setSimulationNodes] = useState<SimulationNode[]>([])
  const [simulationLinks, setSimulationLinks] = useState<SimulationLink[]>([])
  const simulationRef = useRef<Simulation<SimulationNode, SimulationLink> | null>(null)

  useEffect(() => {
    // Common node preparation
    const prepareNode = (node: GraphNode, x: number, y: number): SimulationNode => {
      const type = node.data?.type as ItemType
      const nodeColor =
        nodeColors[type] ||
        `#${GRAPH_CONSTANTS.NODE_DEFAULT_COLOR.toString(16).padStart(6, '0')}`

      return {
        ...node,
        x,
        y,
        nodeColor,
        nodeSize: GRAPH_CONSTANTS.NODE_DEFAULT_SIZE,
        neighbors: [] as SimulationNode[],
        links: [] as SimulationLink[],
      }
    }

    let simNodes: SimulationNode[]

    // Layout-specific node positioning
    if (layoutMode === 'dagre') {
      // Use Dagre hierarchical layout
      const { nodes: layoutedNodes } = getDagreLayoutedElements(nodes, edges, {
        direction: 'TB',
      })
      simNodes = layoutedNodes.map((node) => prepareNode(node, node.x || 0, node.y || 0))
    } else if (layoutMode === 'none') {
      // Static grid layout
      const cols = Math.ceil(Math.sqrt(nodes.length))
      const cellWidth = width / (cols + 1)
      const cellHeight = height / (Math.ceil(nodes.length / cols) + 1)

      simNodes = nodes.map((node, i) => {
        const row = Math.floor(i / cols)
        const col = i % cols
        const x = cellWidth * (col + 1)
        const y = cellHeight * (row + 1)
        return prepareNode(node, x, y)
      })
    } else {
      // Force layout - random initial positions
      simNodes = nodes.map((node) =>
        prepareNode(node, Math.random() * width, Math.random() * height)
      )
    }

    const simLinks: SimulationLink[] = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    }))

    // Build node relationships
    const nodeMap = new Map(simNodes.map((node) => [node.id, node]))
    simLinks.forEach((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      const sourceNode = nodeMap.get(sourceId)
      const targetNode = nodeMap.get(targetId)

      if (sourceNode && targetNode) {
        if (!sourceNode.neighbors.includes(targetNode)) {
          sourceNode.neighbors.push(targetNode)
        }
        if (!targetNode.neighbors.includes(sourceNode)) {
          targetNode.neighbors.push(sourceNode)
        }
        sourceNode.links.push(link)
        targetNode.links.push(link)
      }
    })

    setSimulationNodes(simNodes)
    setSimulationLinks(simLinks)

    // Create D3 force simulation only for force layout
    if (layoutMode === 'force') {
      const simulation = forceSimulation(simNodes)
        .force(
          'link',
          forceLink(simLinks)
            .id((d: any) => d.id)
            .distance(GRAPH_CONSTANTS.FORCE_LINK_DISTANCE)
        )
        .force('charge', forceManyBody().strength(GRAPH_CONSTANTS.FORCE_CHARGE_STRENGTH))
        .force('center', forceCenter(width / 2, height / 2))

      simulationRef.current = simulation

      return () => {
        simulation.stop()
        simulationRef.current = null
      }
    } else {
      // For static layouts, clean up any existing simulation
      if (simulationRef.current) {
        simulationRef.current.stop()
        simulationRef.current = null
      }
    }
  }, [nodes, edges, width, height, nodeColors, layoutMode])

  return {
    simulationNodes,
    simulationLinks,
    simulation: simulationRef.current,
  }
}
