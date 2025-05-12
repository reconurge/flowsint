"use client"

import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type { Sketch } from "@/types/sketch"
import type { EdgeData, NodeData } from "@/types"
import { ActionItem, actionItems } from "@/lib/action-items"

interface SketchState {
    // Nodes data
    nodes: NodeData[],
    edges: EdgeData[],
    currentNode: NodeData | null
    selectedNodes: NodeData[]
    // Nodes states
    isCurrent: (nodeId: string) => boolean
    isSelected: (nodeId: string) => boolean
    // Nodes setters
    setNodes: (nodes: NodeData[]) => void
    setEdges: (edges: EdgeData[]) => void
    setCurrentNode: (node: NodeData | null) => void
    setSelectedNodes: (nodes: NodeData[]) => void
    clearSelectedNodes: () => void
    toggleNodeSelection: (node: NodeData, multiSelect?: boolean) => void
    // Nodes mutators
    addNode: (newNode: Partial<NodeData>) => void
    // Main modal, showing different first categ items
    openMainDialog: boolean,
    setOpenMainDialog: (open: boolean) => void,
    // Second modal, open after clicking on an item
    openFormDialog: boolean,
    setOpenFormDialog: (open: boolean) => void
    // Open the form dialog with correct form proposed
    handleOpenFormModal: (key: string) => void
    // To know the selected node type for the form
    currentNodeType: ActionItem | null
    setCurrentNodeType: (nodeType: ActionItem | null) => void
    // filters
    filters: Record<string, unknown>,
    setFilters: (filters: Record<string, unknown>) => void


}

export const useSketchStore = create<SketchState>()(

    (set, get) => ({
        nodes: [],
        edges: [],
        currentNode: null,
        selectedNodes: [],
        openMainDialog: false,
        openFormDialog: false,
        currentNodeType: null,
        isCurrent: (nodeId) => {
            const { currentNode } = get()
            return currentNode !== null && currentNode.id === nodeId
        },
        isSelected: (nodeId) => {
            const { selectedNodes, isCurrent } = get()
            return selectedNodes.some((node) => node.id === nodeId) || isCurrent(nodeId)
        },
        setNodes: (nodes) => set({ nodes }),
        setEdges: (edges) => set({ edges }),
        setCurrentNode: (node) => {
            set({ currentNode: node })
        },
        setSelectedNodes: (nodes) => {
            set({ selectedNodes: nodes })
        },
        clearSelectedNodes: () => {
            set({ selectedNodes: [], currentNode: null })
        },
        addNode: (newNode) => {
            const { nodes } = get()
            const nodeWithId = {
                id: newNode.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                ...newNode,
            } as NodeData

            const newNodes = [...nodes, nodeWithId]
            set({ nodes: newNodes })
            return nodeWithId
        },
        toggleNodeSelection: (node, multiSelect = false) => {
            const { selectedNodes } = get()
            const isSelected = selectedNodes.some((n) => n.id === node.id)
            if (multiSelect) {
                if (isSelected) {
                    set({ selectedNodes: selectedNodes.filter((n) => n.id !== node.id) })
                } else {
                    set({ selectedNodes: [...selectedNodes, node] })
                }
            } else {
                if (isSelected && selectedNodes.length === 1) {
                    set({ selectedNodes: [] })
                } else {
                    set({ selectedNodes: [node] })
                }
            }
            set({ currentNode: isSelected ? null : node })
        },
        setOpenMainDialog: (open) => set({ openMainDialog: open }),
        setOpenFormDialog: (open) => set({ openFormDialog: open }),
        setCurrentNodeType: (nodeType) => set({ currentNodeType: nodeType }),
        handleOpenFormModal: (key) => {
            const selectedItem = actionItems.find(item => item.key === key) ||
                actionItems
                    .filter(item => item.children)
                    .flatMap(item => item.children || [])
                    .find(item => item.key === key)
            if (!selectedItem) {
                return
            }
            set({
                currentNodeType: selectedItem,
                openMainDialog: false,
                openFormDialog: true
            })
        },
        filters: {},
        setFilters: (filters) => set({ filters }),
    }))