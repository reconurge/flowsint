import type * as LucideIcons from 'lucide-react'

export type NodeProperties = {
  [key: string]: any
}

export const flagColors = {
  red: 'text-red-400 fill-red-200',
  orange: 'text-orange-400 fill-orange-200',
  blue: 'text-blue-400 fill-blue-200',
  green: 'text-green-400 fill-green-200',
  yellow: 'text-yellow-400 fill-yellow-200'
} as const

type flagColor = keyof typeof flagColors

export type NodeMetadata = {
  [key: string]: any
}

export type NodeShape = 'circle' | 'square' | 'hexagon' | 'triangle'

export type GraphNode = {
  id: string
  nodeType: string
  nodeLabel: string
  nodeProperties: NodeProperties
  nodeSize: number
  nodeColor: string | null
  nodeIcon: keyof typeof LucideIcons | null
  nodeImage: string | null
  nodeFlag: flagColor | null
  nodeShape: NodeShape | null
  nodeMetadata: NodeMetadata
  x: number
  y: number
  val?: number
  neighbors?: any[]
  links?: any[]
}

export type GraphEdge = {
  source: GraphNode['id']
  target: GraphNode['id']
  date?: string
  id: string
  label: string
  caption?: string
  type?: string
  weight?: number
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
