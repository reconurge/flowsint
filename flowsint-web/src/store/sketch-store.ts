"use client"

import { create } from "zustand"
import type { Sketch } from "@/types/sketch"
import { Node, Relationship } from "@neo4j-nvl/base"

interface SketchState {
    nodes: Node[]
    edges: Relationship[]
    setNodes: (nodes: Node[]) => void
    addNode: (newNode: Partial<Node>) => void
    setEdges: (edges: Relationship[]) => void
    filters: Record<string, unknown>
    currentNode: Node | null
    panelOpen: boolean
    openNewNode: boolean
    openActionDialog: boolean
    sketch: Sketch | null
    isRefetching: boolean
    setFilters: (filters: Record<string, unknown>) => void
    setOpenNewNode: (open: boolean) => void
    setCurrentNode: (node: Node | null) => void
    setPanelOpen: (open: boolean) => void
    setSketch: (sketch: Sketch | null) => void
    setOpenActionDialog: (open: boolean) => void
}

export const useSketchStore = create<SketchState>((set, get) => ({
    nodes: [],
    edges: [],
    filters: {},
    currentNode: null,
    panelOpen: false,
    openNewNode: false,
    openActionDialog: false,
    sketch: null,
    isRefetching: false,

    setNodes: (nodes) => set({ nodes }),
    addNode: (newNode) => {
        const { nodes, setNodes } = get()
        const newNodes = [...nodes, { ...newNode }] as Node[]
        setNodes(newNodes)
    },
    setEdges: (edges) => set({ edges }),
    setFilters: (filters) => set({ filters }),
    setOpenNewNode: (open) => set({ openNewNode: open }),
    setCurrentNode: (node) => set({ currentNode: node }),
    setPanelOpen: (open) => set({ panelOpen: open }),
    setSketch: (sketch) => set({ sketch }),
    setOpenActionDialog: (open) => set({ openActionDialog: open }),
}))
