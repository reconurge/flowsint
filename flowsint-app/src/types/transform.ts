export interface TransformProperty {
  name: string
  type: string
}

export interface TransformIO {
  type: string
  properties: TransformProperty[]
}

export interface TransformParamSchemaItem {
  name: string
  type: string
  description: string
  default: string
  required: boolean
}

export interface Transform {
  id: string
  class_name: string
  category: string
  name: string
  module: string
  documentation: string | null
  description: string | null
  inputs: TransformIO
  outputs: TransformIO
  type: string
  required_params: boolean
  params: Record<string, string>
  params_schema: TransformParamSchemaItem[]
  settings?: Record<string, string>
  icon: string | null
  wobblyType?: boolean
}

// ================================
// NODE DATA TYPE FOR TRANSFORM STORE
// ================================

export interface TransformNodeData extends Transform, Record<string, unknown> {
  color?: string
  computationState?: 'pending' | 'processing' | 'completed' | 'error'
  key: string
}

// ================================
// DATA STRUCTURES
// ================================

export interface ScansData {
  [category: string]: Transform[]
}

export interface TransformData {
  items: ScansData
}

// ================================
// COMPONENT PROPS INTERFACES
// ================================

export interface TransformItemProps {
  transform: Transform
  category: string
}

export interface TransformNodeProps {
  data: TransformNodeData
  isConnectable?: boolean
  selected?: boolean
}

// ================================
// TRANSFORM DATA STRUCTURES
// ================================

export interface TransformsData {
  [category: string]: Transform[]
}

export interface TransformData {
  items: TransformsData
}

// ================================
// COMPONENT PROPS INTERFACES
// ================================

export interface TransformItemProps {
  transform: Transform
  category: string
}
