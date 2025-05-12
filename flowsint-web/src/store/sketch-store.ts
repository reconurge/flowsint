"use client"

import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type { Sketch } from "@/types/sketch"
import { EdgeData, NodeData } from "@/types"

interface SketchState {
    nodes: NodeData[]
    edges: EdgeData[]
    setNodes: (nodes: NodeData[]) => void
    addNode: (newNode: Partial<NodeData>) => void
    setEdges: (edges: EdgeData[]) => void
    filters: Record<string, unknown>
    currentNode: NodeData | null
    selectedNodes: NodeData[]
    panelOpen: boolean
    openNewNode: boolean
    openActionDialog: boolean
    sketch: Sketch | null
    isRefetching: boolean
    setFilters: (filters: Record<string, unknown>) => void
    setOpenNewNode: (open: boolean) => void
    setCurrentNode: (node: NodeData | null) => void
    setSelectedNodes: (nodes: NodeData[]) => void
    toggleNodeSelection: (node: NodeData, multiSelect?: boolean) => void
    setPanelOpen: (open: boolean) => void
    setSketch: (sketch: Sketch | null) => void
    setOpenActionDialog: (open: boolean) => void
    clearSelectedNodes: () => void
}

// Ajout d'outils de développement pour faciliter le debug
export const useSketchStore = create<SketchState>()(
    devtools(
        (set, get) => ({
            nodes: [],
            edges: [],
            filters: {},
            currentNode: null,
            selectedNodes: [],
            panelOpen: false,
            openNewNode: false,
            openActionDialog: false,
            sketch: null,
            isRefetching: false,

            setNodes: (nodes) => set({ nodes }, false, "setNodes"),
            addNode: (newNode) => {
                const { nodes } = get()
                // S'assurer que le nœud a un ID unique s'il n'en a pas déjà un
                const nodeWithId = {
                    id: newNode.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    ...newNode
                } as NodeData

                const newNodes = [...nodes, nodeWithId]
                set({ nodes: newNodes }, false, "addNode")
                return nodeWithId
            },
            setEdges: (edges) => set({ edges }, false, "setEdges"),
            setFilters: (filters) => set({ filters }, false, "setFilters"),
            setOpenNewNode: (open) => set({ openNewNode: open }, false, "setOpenNewNode"),

            setCurrentNode: (node) => {
                console.log("Setting current node:", node)
                set({ currentNode: node }, false, "setCurrentNode")
                // Si nous définissons un nœud actuel et que le panneau n'est pas ouvert, ouvrons-le
                if (node && !get().panelOpen) {
                    set({ panelOpen: true }, false, "openPanelWithNode")
                }
            },

            setSelectedNodes: (nodes) => {
                console.log("Setting selected nodes:", nodes)
                set({ selectedNodes: nodes }, false, "setSelectedNodes")
            },

            toggleNodeSelection: (node, multiSelect = false) => {
                const { selectedNodes } = get()
                const isSelected = selectedNodes.some(n => n.id === node.id)

                if (multiSelect) {
                    // Mode multi-sélection: ajouter ou retirer le nœud
                    if (isSelected) {
                        set(
                            { selectedNodes: selectedNodes.filter(n => n.id !== node.id) },
                            false,
                            "removeNodeFromSelection"
                        )
                    } else {
                        set(
                            { selectedNodes: [...selectedNodes, node] },
                            false,
                            "addNodeToSelection"
                        )
                    }
                } else {
                    // Mode sélection unique: remplacer ou désélectionner
                    if (isSelected && selectedNodes.length === 1) {
                        set({ selectedNodes: [] }, false, "deselectNode")
                    } else {
                        set({ selectedNodes: [node] }, false, "selectSingleNode")
                    }
                }

                // Définir également comme nœud actuel
                set({ currentNode: isSelected ? null : node }, false, "updateCurrentNodeWithSelection")
            },

            clearSelectedNodes: () => {
                set({ selectedNodes: [], currentNode: null }, false, "clearSelectedNodes")
            },

            setPanelOpen: (open) => set({ panelOpen: open }, false, "setPanelOpen"),
            setSketch: (sketch) => set({ sketch }, false, "setSketch"),
            setOpenActionDialog: (open) => set({ openActionDialog: open }, false, "setOpenActionDialog"),
        }),
        { name: "sketch-store" }
    )
)