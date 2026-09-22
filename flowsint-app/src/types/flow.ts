import type { FlowNode, FlowEdge } from '@/stores/flow-store'

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
  // Backend has been observed sending both shapes — consumers (see
  // flow-list.tsx) already defend against either.
  category: string | string[]
  created_at: string
  last_updated_at: string
  wobblyType?: boolean
  flow_schema?: {
    nodes: FlowNode[]
    edges: FlowEdge[]
  }
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

// ================================
// FLOW COMPUTATION / SIMULATION
// ================================

// Only nodeId is ever read off a step by the simulation playback — the
// backend result carries more, but nothing here reads it.
export interface FlowBranchStep {
  nodeId: string
}

export interface FlowBranch {
  steps: FlowBranchStep[]
}

export interface ComputeFlowResult {
  flowBranches: FlowBranch[]
}
