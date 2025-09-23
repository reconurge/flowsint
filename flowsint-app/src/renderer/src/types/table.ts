import { GraphNode } from '@/stores/graph-store'

export type Row = {
  id: string
  label: string
  type: string
  created_at: string
}

export type RelationshipType = {
  source: GraphNode
  target: GraphNode
  edge: { label: string }
}
