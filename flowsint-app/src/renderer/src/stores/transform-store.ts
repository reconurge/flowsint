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
import { toast } from "sonner"
import { type ScannerNodeData } from "@/types/transform"

export type NodeData = ScannerNodeData

export type TransformNode = Node<NodeData>
export type TransformEdge = Edge

export interface TransformState {
    // Node State
    nodes: TransformNode[]
    selectedNode: TransformNode | null
    // Edge State
    edges: TransformEdge[]
    // UI State
    loading: boolean
    openParamsDialog: boolean
    openTransformSheet: boolean
    // Node Actions
    setNodes: (nodes: TransformNode[] | ((prev: TransformNode[]) => TransformNode[])) => void
    onNodesChange: OnNodesChange
    setSelectedNode: (node: TransformNode | null) => void
    deleteNode: (nodeId: string) => void
    updateNode: (node: TransformNode) => void
    // Edge Actions
    setEdges: (edges: TransformEdge[] | ((prev: TransformEdge[]) => TransformEdge[])) => void
    onEdgesChange: OnEdgesChange
    onConnect: OnConnect
    // UI Actions
    setLoading: (loading: boolean) => void
    setOpenParamsDialog: (openParamsDialog: boolean, node?: TransformNode) => void
    setOpenTransformSheet: (openTransformSheet: boolean, node?: TransformNode) => void
}

// ================================
// DEFAULT STYLES & CONFIGURATION
// ================================

const defaultEdgeStyle = { stroke: "#64748b" }
const defaultMarkerEnd: EdgeMarker = {
    type: MarkerType.ArrowClosed,
    width: 15,
    height: 15,
    color: "#64748b",
}

// ================================
// TRANSFORM STORE IMPLEMENTATION
// ================================

export const useTransformStore = create<TransformState>((set, get) => ({
    // ================================
    // STATE INITIALIZATION
    // ================================
    // Node State
    nodes: [] as TransformNode[],
    selectedNode: null,
    // Edge State
    edges: [] as TransformEdge[],
    // UI State
    loading: false,
    openParamsDialog: false,
    openTransformSheet: false,
    // ================================
    // NODE ACTIONS
    // ================================
    setNodes: (nodes) => set({ nodes: typeof nodes === 'function' ? nodes(get().nodes) : nodes }),
    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes) as TransformNode[],
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
            nodes: get().nodes.map((n) => n.id === node.id ? node : n),
        })
    },
    // ================================
    // EDGE ACTIONS
    // ================================
    setEdges: (edges) => set({ edges: typeof edges === 'function' ? edges(get().edges) : edges }),
    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        })
    },
    onConnect: (connection: Connection) => {
        if ([connection.targetHandle, "Any"].includes(connection.sourceHandle)) {
            toast.error(`Cannot connect ${connection.sourceHandle} to ${connection.targetHandle}.`)
            return
        }
        const edge: TransformEdge = {
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
            toast.error("Please select a node first to configure its parameters.")
            return
        }
        set({ openParamsDialog })
    },
    setOpenTransformSheet: (openTransformSheet, node) => {
        // Only allow opening the dialog if there's a selected node
        if (node) {
            set({ selectedNode: node })
        }
        if (openTransformSheet && !get().selectedNode) {
            toast.error("Please select a node first to add a connector.")
            return
        }
        set({ openTransformSheet })
    }
}))
