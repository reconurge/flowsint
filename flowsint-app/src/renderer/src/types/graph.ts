export type NodeData = {
  id: string
  type: string
  label: string
  created_at: string
  // Allow any other properties
  [key: string]: any
}

export type GraphNode = {
  collapsed?: boolean
  hidden?: boolean
  x?: number
  y?: number
  nodeLabel?: string
  nodeColor?: string
  nodeSize?: number
  nodeType?: string
  val?: number
  neighbors?: any[]
  links?: any[]
  id: string
  data: NodeData
}

export type GraphEdge = {
  source: string
  target: string
  date?: string
  id: string
  label: string
  caption?: string
  type?: string
  confidence_level?: number | string
}

export type ForceGraphSetting = {
  value: any
  min?: number
  max?: number
  step?: number
  type?: string
  description?: string
}

export type GeneralSetting = {
  value: any
  options?: any[]
  description?: string
}

// Extended setting types for the centralized store
export type ExtendedSetting = {
  value: any
  type: string
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
  description?: string
}

export type Settings = {
  [key: string]: ExtendedSetting
}
