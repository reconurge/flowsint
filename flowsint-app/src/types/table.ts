import { GraphNode, GraphEdge } from "./graph"

export type Row = {
  id: string
  label: string
  type: string
  created_at: string
}

export type RelationshipType = {
  source: GraphNode
  target: GraphNode
  edge: GraphEdge
}
