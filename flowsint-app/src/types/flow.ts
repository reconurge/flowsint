// ================================
// FLOW TYPE DEFINITIONS
// ================================

export interface Flow {
  id: string
  class_name: string
  name: string
  module: string
  description: string
  documentation: string
  category: string
  created_at: string
  last_updated_at: string
  wobblyType?: boolean
}

// ================================
// FLOW DATA STRUCTURES
// ================================

export interface FlowsData {
  [category: string]: Flow[]
}

export interface FlowData {
  items: FlowsData
}

// ================================
// COMPONENT PROPS INTERFACES
// ================================

export interface FlowItemProps {
  flow: Flow
  category: string
}
