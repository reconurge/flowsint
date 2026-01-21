import { GraphNode, GraphEdge } from '@/types'
import { ItemType } from '@/stores/node-display-settings'
import { CONSTANTS, GRAPH_COLORS } from './constants'
import { GraphData } from './types'

interface TransformGraphDataParams {
  nodes: GraphNode[]
  edges: GraphEdge[]
  nodeColors: Record<ItemType, string>
}

export const transformGraphData = ({
  nodes,
  edges,
  nodeColors
}: TransformGraphDataParams): GraphData => {
  const transformedNodes = nodes.map((node) => {
    const type = node.nodeType as ItemType
    const baseNodeSize = CONSTANTS.NODE_DEFAULT_SIZE
    const nodeSize = node.nodeSize || baseNodeSize
    const transformed = {
      ...node,
      nodeLabel: node.nodeLabel || node.id,
      nodeColor: node.nodeColor || nodeColors[type] || GRAPH_COLORS.NODE_DEFAULT,
      nodeSize: nodeSize,
      val: (nodeSize * CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER) / 5,
      neighbors: [] as any[],
      links: [] as any[]
    } as any

    if (node.x !== undefined && node.y !== undefined) {
      transformed.fx = node.x
      transformed.fy = node.y
    }

    return transformed
  })

  const nodeMap = new Map(transformedNodes.map((node) => [node.id, node]))

  // Group edges
  const edgeGroups = new Map<string, GraphEdge[]>()
  edges.forEach((edge) => {
    const key = `${edge.source}-${edge.target}`
    if (!edgeGroups.has(key)) {
      edgeGroups.set(key, [])
    }
    edgeGroups.get(key)!.push(edge)
  })

  const transformedEdges = edges.map((edge) => {
    const key = `${edge.source}-${edge.target}`
    const group = edgeGroups.get(key)!
    const groupIndex = group.indexOf(edge)
    const groupSize = group.length
    const curvature = groupSize > 1 ? (groupIndex - (groupSize - 1) / 2) * 0.2 : 0

    return {
      ...edge,
      edgeLabel: edge.label,
      curvature,
      groupIndex,
      groupSize
    }
  })

  // Build relationships
  const neighborsMap = new Map<string, Set<any>>()
  const linksMap = new Map<string, any[]>()

  transformedEdges.forEach((link) => {
    const sourceNode = nodeMap.get(link.source)
    const targetNode = nodeMap.get(link.target)

    if (sourceNode && targetNode) {
      if (!neighborsMap.has(sourceNode.id)) neighborsMap.set(sourceNode.id, new Set())
      if (!neighborsMap.has(targetNode.id)) neighborsMap.set(targetNode.id, new Set())
      if (!linksMap.has(sourceNode.id)) linksMap.set(sourceNode.id, [])
      if (!linksMap.has(targetNode.id)) linksMap.set(targetNode.id, [])

      neighborsMap.get(sourceNode.id)!.add(targetNode)
      neighborsMap.get(targetNode.id)!.add(sourceNode)

      linksMap.get(sourceNode.id)!.push(link)
      linksMap.get(targetNode.id)!.push(link)
    }
  })

  transformedNodes.forEach((node) => {
    node.neighbors = Array.from(neighborsMap.get(node.id) || [])
    node.links = linksMap.get(node.id) || []
  })
  return {
    nodes: transformedNodes,
    links: transformedEdges
  }
}
