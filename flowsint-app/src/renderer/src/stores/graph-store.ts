import { create } from "zustand"
import type { EdgeData, NodeData } from "@/types"
import {
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    type Connection,
    applyNodeChanges,
    applyEdgeChanges
} from "@xyflow/react"
import { type ActionItem } from "@/lib/action-items"

export type GraphNode = Node<NodeData> & {
    collapsed?: boolean;
    hidden?: boolean;
    x?: number;
    y?: number;
}
export type GraphEdge = Edge<EdgeData>

interface GraphState {
    // === Graph ===
    nodes: GraphNode[]
    edges: GraphEdge[]
    setNodes: (nodes: GraphNode[]) => void
    setEdges: (edges: GraphEdge[]) => void
    addNode: (newNode: Partial<GraphNode>) => GraphNode
    addEdge: (newEdge: Partial<GraphEdge>) => GraphEdge
    removeNodes: (nodeIds: string[]) => void
    removeEdges: (edgeIds: string[]) => void
    updateGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void
    updateNode: (nodeId: string, updates: Partial<NodeData>) => void
    updateEdge: (edgeId: string, updates: Partial<EdgeData>) => void
    onNodesChange: OnNodesChange
    onEdgesChange: OnEdgesChange
    onConnect: OnConnect

    // === Selection & Current ===
    currentNode: GraphNode | null
    selectedNodes: GraphNode[]
    isCurrent: (nodeId: string) => boolean
    isSelected: (nodeId: string) => boolean
    setCurrentNode: (node: GraphNode | null) => void
    setSelectedNodes: (nodes: GraphNode[]) => void
    clearSelectedNodes: () => void
    toggleNodeSelection: (node: GraphNode, multiSelect?: boolean) => void

    // === Relation ===
    relatedNodeToAdd: GraphNode | null
    setRelatedNodeToAdd: (node: GraphNode | null) => void

    // === Dialogs ===
    openMainDialog: boolean
    openFormDialog: boolean
    openAddRelationDialog: boolean
    openNodeEditorModal: boolean
    setOpenMainDialog: (open: boolean) => void
    setOpenFormDialog: (open: boolean) => void
    setOpenAddRelationDialog: (open: boolean) => void
    setOpenNodeEditorModal: (open: boolean) => void

    // === Action Type for Form ===
    currentNodeType: ActionItem | null
    setCurrentNodeType: (nodeType: ActionItem | null) => void
    handleOpenFormModal: (selectedItem: ActionItem | undefined) => void

    // === Action Type for Edit form ===
    handleEdit: (node: GraphNode) => void

    // === Filters ===
    filters: Record<string, unknown>
    setFilters: (filters: Record<string, unknown>) => void

    // === Collapse/Expand logic ===
    toggleCollapse: (nodeId: string) => void

    // === Utils ===
    nodesLength: number
    edgesLength: number
    getNodesLength: () => number
    getEdgesLength: () => number
}

export const useGraphStore = create<GraphState>()((set, get) => ({
    // === Graph ===
    nodes: [],
    edges: [],
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    addNode: (newNode) => {
        const { nodes } = get()
        const nodeWithId: GraphNode = {
            id: newNode.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            position: {
                x: 0,
                y: 0,
            },
            ...newNode,
        } as GraphNode
        set({ nodes: [...nodes, nodeWithId], currentNode: nodeWithId })
        return nodeWithId
    },
    addEdge: (newEdge) => {
        const { edges } = get()
        const edgeWithId: GraphEdge = {
            id: newEdge.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            ...newEdge,
        } as GraphEdge
        set({ edges: [...edges, edgeWithId] })
        return edgeWithId
    },
    removeNodes: (nodeIds: string[]) => {
        const { nodes, edges } = get();
        const newNodes = nodes.filter((n) => !nodeIds.includes(n.id));
        const newEdges = edges.filter(
            (e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
        );
        set({ nodes: newNodes, edges: newEdges });
    },
    removeEdges: (edgeIds: string[]) => {
        const { edges } = get()
        const newEdges = edges.filter((e) => !edgeIds.includes(e.id))
        set({ edges: newEdges })
    },
    updateGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => {
        set({ nodes, edges })
    },
    updateNode: (nodeId, updates) => {
        const { nodes } = get()
        const updatedNodes = nodes.map(node =>
            node.id === nodeId
                ? { ...node, data: { ...node.data, ...updates } }
                : node
        )
        set({ nodes: updatedNodes })
    },
    updateEdge: (edgeId, updates) => {
        const { edges } = get()
        const updatedEdges = edges.map(edge =>
            edge.id === edgeId
                ? { ...edge, data: { ...edge.data, ...updates } as EdgeData }
                : edge
        )
        set({ edges: updatedEdges })
    },
    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes) as GraphNode[],
        })
    },
    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges) as GraphEdge[],
        })
    },
    onConnect: (connection: Connection) => {
        const edge: GraphEdge = {
            id: `${connection.source}-${connection.target}`,
            source: connection.source!,
            target: connection.target!,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
        }
        set({
            edges: [...get().edges, edge],
        })
    },

    // === Selection & Current ===
    currentNode: null,
    selectedNodes: [],
    isCurrent: (nodeId) => get().currentNode?.id === nodeId,
    isSelected: (nodeId) => {
        const { selectedNodes, isCurrent } = get()
        return selectedNodes.some((node) => node.id === nodeId) || isCurrent(nodeId)
    },
    setCurrentNode: (node) => set({ currentNode: node }),
    setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
    clearSelectedNodes: () => set({ selectedNodes: [], currentNode: null }),
    toggleNodeSelection: (node, multiSelect = false) => {
        const { selectedNodes, currentNode } = get()
        const isSelected = selectedNodes.some((n) => n.id === node.id)
        let newSelected: GraphNode[]

        if (multiSelect) {
            newSelected = isSelected
                ? selectedNodes.filter((n) => n.id !== node.id)
                : [...selectedNodes, node]
        } else {
            newSelected = isSelected && selectedNodes.length === 1 ? [] : [node]
        }

        set({
            selectedNodes: newSelected,
            currentNode: multiSelect ? currentNode : (isSelected ? null : node),
        })
    },

    // === Relation ===
    relatedNodeToAdd: null,
    setRelatedNodeToAdd: (node) => set({ relatedNodeToAdd: node }),

    // === Dialogs ===
    openMainDialog: false,
    openFormDialog: false,
    openAddRelationDialog: false,
    openNodeEditorModal: false,
    setOpenMainDialog: (open) => set({ openMainDialog: open }),
    setOpenFormDialog: (open) => set({ openFormDialog: open }),
    setOpenAddRelationDialog: (open) => set({ openAddRelationDialog: open }),
    setOpenNodeEditorModal: (open) => set({ openNodeEditorModal: open }),

    // === Action Type for Edit form ===
    handleEdit: (node) => set({ currentNode: node, openNodeEditorModal: true }),

    // === Action Type for Form ===
    currentNodeType: null,
    setCurrentNodeType: (nodeType) => set({ currentNodeType: nodeType }),
    handleOpenFormModal: (selectedItem) => {
        if (!selectedItem) return
        set({
            currentNodeType: selectedItem,
            openMainDialog: false,
            openFormDialog: true,
        })
    },

    // === Filters ===
    filters: {},
    setFilters: (filters) => set({ filters }),

    // === Collapse/Expand logic ===
    toggleCollapse: (nodeId) => {
        const { nodes, edges } = get();
        // Find the node
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        const isCollapsing = !node.collapsed;
        // Recursively find all descendants
        const getDescendants = (parentId: string, accNodes: Set<string>, accEdges: Set<string>) => {
            edges.forEach(edge => {
                if (edge.source === parentId) {
                    accEdges.add(edge.id);
                    accNodes.add(edge.target);
                    getDescendants(edge.target, accNodes, accEdges);
                }
            });
        };
        const descendantNodeIds = new Set<string>();
        const descendantEdgeIds = new Set<string>();
        getDescendants(nodeId, descendantNodeIds, descendantEdgeIds);
        // Update nodes and edges
        set({
            nodes: nodes.map(n =>
                n.id === nodeId
                    ? { ...n, collapsed: isCollapsing }
                    : descendantNodeIds.has(n.id)
                        ? { ...n, hidden: isCollapsing }
                        : n
            ),
            edges: edges.map(e =>
                descendantEdgeIds.has(e.id)
                    ? { ...e, hidden: isCollapsing }
                    : e
            ),
        });
    },

    // === Utils ===
    nodesLength: 0,
    edgesLength: 0,

    getNodesLength: () => get().nodes.length,
    getEdgesLength: () => get().edges.length,
}))
