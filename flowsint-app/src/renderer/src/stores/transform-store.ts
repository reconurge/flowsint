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

export type TransformNode = Node<NodeData>
export type TransformEdge = Edge

export interface TransformState {
    nodes: TransformNode[]
    edges: TransformEdge[]
    selectedNode: TransformNode | null
    loading: boolean
    setNodes: (nodes: TransformNode[] | ((prev: TransformNode[]) => TransformNode[])) => void
    setEdges: (edges: TransformEdge[] | ((prev: TransformEdge[]) => TransformEdge[])) => void
    onNodesChange: OnNodesChange
    onEdgesChange: OnEdgesChange
    onConnect: OnConnect
    setSelectedNode: (node: TransformNode | null) => void
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

export const useTransformStore = create<TransformState>((set, get) => ({
    nodes: [] as TransformNode[],
    edges: [] as TransformEdge[],
    selectedNode: null,
    loading: false,
    setNodes: (nodes) => set({ nodes: typeof nodes === 'function' ? nodes(get().nodes) : nodes }),
    setEdges: (edges) => set({ edges: typeof edges === 'function' ? edges(get().edges) : edges }),
    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes) as TransformNode[],
        })
    },
    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        })
    },
    onConnect: (connection: Connection) => {
        if (connection.sourceHandle !== connection.targetHandle) {
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