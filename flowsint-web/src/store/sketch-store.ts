"use client"

import { create } from "zustand"
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
    panelOpen: boolean
    openNewNode: boolean
    openActionDialog: boolean
    sketch: Sketch | null
    isRefetching: boolean
    setFilters: (filters: Record<string, unknown>) => void
    setOpenNewNode: (open: boolean) => void
    setCurrentNode: (node: NodeData | null) => void
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
        const newNodes = [...nodes, { ...newNode }] as NodeData[]
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
