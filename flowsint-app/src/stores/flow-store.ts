import { create } from 'zustand'
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  type EdgeMarker,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react'
import { toast } from 'sonner'
import { type EnricherNodeData } from '@/types/enricher'

export type NodeData = EnricherNodeData

export type FlowNode = Node<NodeData>
export type FlowEdge = Edge

export interface EnricherState {
  // Node State
  nodes: FlowNode[]
  selectedNode: FlowNode | null
  // Edge State
  edges: FlowEdge[]
  // UI State
  loading: boolean
  openParamsDialog: boolean
  openFlowSheet: boolean
  // Node Actions
  setNodes: (nodes: FlowNode[] | ((prev: FlowNode[]) => FlowNode[])) => void
  onNodesChange: OnNodesChange
  setSelectedNode: (node: FlowNode | null) => void
  deleteNode: (nodeId: string) => void
  updateNode: (node: FlowNode) => void
  // Edge Actions
  setEdges: (edges: FlowEdge[] | ((prev: FlowEdge[]) => FlowEdge[])) => void
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  // UI Actions
  setLoading: (loading: boolean) => void
  setOpenParamsDialog: (openParamsDialog: boolean, node?: FlowNode) => void
  setOpenFlowSheet: (openFlowSheet: boolean, node?: FlowNode) => void
}

const defaultEdgeStyle = { stroke: '#64748b' }
const defaultMarkerEnd: EdgeMarker = {
  type: MarkerType.ArrowClosed,
  width: 15,
  height: 15,
  color: '#64748b'
}

export const useFlowStore = create<EnricherState>((set, get) => ({
  nodes: [] as FlowNode[],
  selectedNode: null,
  // Edge State
  edges: [] as FlowEdge[],
  // UI State
  loading: false,
  openParamsDialog: false,
  openFlowSheet: false,
  // ================================
  // NODE ACTIONS
  // ================================
  setNodes: (nodes) => set({ nodes: typeof nodes === 'function' ? nodes(get().nodes) : nodes }),
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as FlowNode[]
    })
  },
  setSelectedNode: (node) => set({ selectedNode: node }),
  deleteNode: (nodeId) => {
    const { nodes, edges } = get()
    set({
      nodes: nodes.filter((node) => node.id !== nodeId),
      edges: edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNode: nodes.find((node) => node.id === nodeId) ? null : get().selectedNode
    })
  },
  updateNode: (node) => {
    set({
      nodes: get().nodes.map((n) => (n.id === node.id ? node : n))
    })
  },
  // ================================
  // EDGE ACTIONS
  // ================================
  setEdges: (edges) => set({ edges: typeof edges === 'function' ? edges(get().edges) : edges }),
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges)
    })
  },
  onConnect: (connection: Connection) => {
    if ([connection.targetHandle, 'Any'].includes(connection.sourceHandle)) {
      toast.error(`Cannot connect ${connection.sourceHandle} to ${connection.targetHandle}.`)
      return
    }
    const edge: FlowEdge = {
      id: `${connection.source}-${connection.target}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      style: defaultEdgeStyle,
      markerEnd: defaultMarkerEnd
    }
    set({
      edges: [...get().edges, edge]
    })
  },
  // ================================
  // UI ACTIONS
  // ================================
  setLoading: (loading) => set({ loading }),
  setOpenParamsDialog: (openParamsDialog, node) => {
    // Only allow opening the dialog if there's a selected node
    if (node) {
      set({ selectedNode: node })
    }
    if (openParamsDialog && !get().selectedNode) {
      toast.error('Please select a node first to configure its parameters.')
      return
    }
    set({ openParamsDialog })
  },
  setOpenFlowSheet: (openFlowSheet, node) => {
    // Only allow opening the dialog if there's a selected node
    if (node) {
      set({ selectedNode: node })
    }
    if (openFlowSheet && !get().selectedNode) {
      toast.error('Please select a node first to add a connector.')
      return
    }
    set({ openFlowSheet })
  }
}))
