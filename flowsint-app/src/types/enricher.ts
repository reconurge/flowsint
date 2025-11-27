export interface EnricherProperty {
  name: string
  type: string
}

export interface EnricherIO {
  type: string
  properties: EnricherProperty[]
}

export interface EnricherParamSchemaItem {
  name: string
  type: string
  description: string
  default: string
  required: boolean
}

export interface Enricher {
  id: string
  class_name: string
  category: string
  name: string
  module: string
  documentation: string | null
  description: string | null
  inputs: EnricherIO
  outputs: EnricherIO
  type: string
  required_params: boolean
  params: Record<string, string>
  params_schema: EnricherParamSchemaItem[]
  settings?: Record<string, string>
  icon: string | null
  wobblyType?: boolean
}

// ================================
// NODE DATA TYPE FOR ENRICHER STORE
// ================================

export interface EnricherNodeData extends Enricher, Record<string, unknown> {
  color?: string
  computationState?: 'pending' | 'processing' | 'completed' | 'error'
  key: string
}

// ================================
// DATA STRUCTURES
// ================================

export interface ScansData {
  [category: string]: Enricher[]
}

export interface EnricherData {
  items: ScansData
}

// ================================
// COMPONENT PROPS INTERFACES
// ================================

export interface EnricherItemProps {
  enricher: Enricher
  category: string
}

export interface EnricherNodeProps {
  data: EnricherNodeData
  isConnectable?: boolean
  selected?: boolean
}

// ================================
// ENRICHER DATA STRUCTURES
// ================================

export interface EnrichersData {
  [category: string]: Enricher[]
}

export interface EnricherData {
  items: EnrichersData
}

// ================================
// COMPONENT PROPS INTERFACES
// ================================

export interface EnricherItemProps {
  enricher: Enricher
  category: string
}
