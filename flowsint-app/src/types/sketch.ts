import { type Profile } from './profile'
import { type Investigation } from './investigation'
import { type GraphNode, type GraphEdge } from './graph'

export interface Sketch {
  id: string
  title: string
  description: string
  status?: string
  priority?: string
  created_at: string
  last_updated_at: string
  owner: Profile
  owner_id: string
  relations?: unknown[]
  individuals?: unknown[]
  investigation?: Investigation
  investigation_id: string
  members?: { profile: Profile }[]
}

// Response shape shared by every sketch-service endpoint that returns a
// graph slice (full sketch graph, or a single node's neighbors).
export interface SketchGraphData {
  nds: GraphNode[]
  rls: GraphEdge[]
}

export interface DetectionResult {
  type: string
  key: string
  fields: Array<{
    name: string
    label: string
    description: string
    required: boolean
    primary: boolean
    value: string | null
  }>
}

// One row of the import-preview mapping table: a detected entity the user
// can include/exclude and relabel before it's persisted as a node.
export interface EntityMapping {
  id: string
  entity_type: string
  include: boolean
  nodeLabel: string
  node_id?: string
  data: Record<string, unknown>
}

export interface PreviewEntity {
  detected_type: string
  node_id?: string | number
  obj: Record<string, unknown> & { nodeLabel: string }
}

export interface PreviewEdge {
  from_id: string
  to_id: string
  from_obj: { label: string }
  to_obj: { label: string }
  label: string
}

export interface ImportAnalysisResult {
  entities: Record<string, { results: PreviewEntity[] }>
  edges: PreviewEdge[]
}

export interface ImportExecutionResult {
  status: string
  nodes_created: number
  errors: string[]
}
