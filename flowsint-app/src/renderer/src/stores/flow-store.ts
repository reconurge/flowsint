import { create } from "zustand"
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
} from "@xyflow/react"


export interface NodeData {
    class_name: string
    module: string
    key: string
    doc?: string | null
    computationState?: 'pending' | 'processing' | 'completed' | 'error'
    name?: string
    category?: string
    type?: string
    inputs?: { type: string; properties: Array<{ name: string; type: string }> }
    outputs?: { type: string; properties: Array<{ name: string; type: string }> }
    color?: string
    [key: string]: unknown
}

export type FlowNode = Node<NodeData>
export type FlowEdge = Edge

export interface FlowState {
    nodes: FlowNode[]
    edges: FlowEdge[]
    selectedNode: FlowNode | null
    loading: boolean
    setNodes: (nodes: FlowNode[] | ((prev: FlowNode[]) => FlowNode[])) => void
    setEdges: (edges: FlowEdge[] | ((prev: FlowEdge[]) => FlowEdge[])) => void
    onNodesChange: OnNodesChange
    onEdgesChange: OnEdgesChange
    onConnect: OnConnect
    setSelectedNode: (node: FlowNode | null) => void
    setLoading: (loading: boolean) => void
    deleteNode: (nodeId: string) => void
}

const defaultEdgeStyle = { stroke: "#64748b" }
const defaultMarkerEnd: EdgeMarker = {
    type: MarkerType.ArrowClosed,
    width: 15,
    height: 15,
    color: "#64748b",
}

export const useFlowStore = create<FlowState>((set, get) => ({
    nodes: [] as FlowNode[],
    edges: [] as FlowEdge[],
    selectedNode: null,
    loading: false,
    setNodes: (nodes) => set({ nodes: typeof nodes === 'function' ? nodes(get().nodes) : nodes }),
    setEdges: (edges) => set({ edges: typeof edges === 'function' ? edges(get().edges) : edges }),
    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes) as FlowNode[],
        })
    },
    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        })
    },
    onConnect: (connection: Connection) => {
        const edge: FlowEdge = {
            id: `${connection.source}-${connection.target}`,
            source: connection.source!,
            target: connection.target!,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
            style: defaultEdgeStyle,
            markerEnd: defaultMarkerEnd,
        }
        set({
            edges: [...get().edges, edge],
        })
    },
    setSelectedNode: (node) => set({ selectedNode: node }),
    setLoading: (loading) => set({ loading }),
    deleteNode: (nodeId) => {
        const { nodes, edges } = get()
        set({
            nodes: nodes.filter((node) => node.id !== nodeId),
            edges: edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
            selectedNode: nodes.find((node) => node.id === nodeId) ? null : get().selectedNode
        })
    },
})) 