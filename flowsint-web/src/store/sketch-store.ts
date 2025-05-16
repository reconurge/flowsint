"use client"

import { create } from "zustand"
import type { EdgeData, NodeData } from "@/types"
import { ActionItem, findActionItemByKey } from "@/lib/action-items"

interface SketchState {
    // === Graph ===
    nodes: NodeData[]
    edges: EdgeData[]
    setNodes: (nodes: NodeData[]) => void
    setEdges: (edges: EdgeData[]) => void
    addNode: (newNode: Partial<NodeData>) => NodeData
    addEdge: (newEdge: Partial<EdgeData>) => EdgeData

    // === Selection & Current ===
    currentNode: NodeData | null
    selectedNodes: NodeData[]
    isCurrent: (nodeId: string) => boolean
    isSelected: (nodeId: string) => boolean
    setCurrentNode: (node: NodeData | null) => void
    setSelectedNodes: (nodes: NodeData[]) => void
    clearSelectedNodes: () => void
    toggleNodeSelection: (node: NodeData, multiSelect?: boolean) => void

    // === Dialogs ===
    openMainDialog: boolean
    openFormDialog: boolean
    openAddRelationDialog: boolean
    setOpenMainDialog: (open: boolean) => void
    setOpenFormDialog: (open: boolean) => void
    setOpenAddRelationDialog: (open: boolean) => void

    // === Action Type for Form ===
    currentNodeType: ActionItem | null
    setCurrentNodeType: (nodeType: ActionItem | null) => void
    handleOpenFormModal: (key: string) => void

    // === Filters ===
    filters: Record<string, unknown>
    setFilters: (filters: Record<string, unknown>) => void
}

export const useSketchStore = create<SketchState>()((set, get) => ({
    // === Graph ===
    nodes: [],
    edges: [],
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    addNode: (newNode) => {
        const { nodes } = get()
        const nodeWithId: NodeData = {
            id: newNode.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            ...newNode,
        } as NodeData
        set({ nodes: [...nodes, nodeWithId] })
        return nodeWithId
    },
    addEdge: (newEdge) => {
        const { edges } = get()
        const edgeWithId: EdgeData = {
            id: newEdge.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            ...newEdge,
        } as EdgeData
        set({ edges: [...edges, edgeWithId] })
        return edgeWithId
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
        let newSelected: NodeData[]

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

    // === Dialogs ===
    openMainDialog: false,
    openFormDialog: false,
    openAddRelationDialog: false,
    setOpenMainDialog: (open) => set({ openMainDialog: open }),
    setOpenFormDialog: (open) => set({ openFormDialog: open }),
    setOpenAddRelationDialog: (open) => set({ openAddRelationDialog: open }),

    // === Action Type for Form ===
    currentNodeType: null,
    setCurrentNodeType: (nodeType) => set({ currentNodeType: nodeType }),
    handleOpenFormModal: (key) => {
        const selectedItem = findActionItemByKey(key)
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
}))
