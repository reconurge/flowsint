"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { useQuery, type QueryObserverResult } from "@tanstack/react-query"
import type { Sketch } from "@/types/sketch"

interface QueryResult<T> {
    data: T
    isLoading: boolean
    refetch: () => Promise<void>
}
interface SketchResults {
    sketch: QueryResult<Sketch>
}
interface SketchState {
    filters: any
    settings: {
        showNodeLabel: boolean
        showEdgeLabel: boolean
        showMiniMap: boolean
        showCopyIcon: boolean
        showNodeToolbar: boolean
    }
    openSettingsModal: boolean
    currentNode: any
    panelOpen: boolean
    openNewNode: boolean,
    openActionDialog: boolean,
    sketch: Sketch | null
    isRefetching: boolean
    setFilters: (filters: any) => void
    setSettings: (settings: any) => void
    setOpenSettingsModal: (open: boolean) => void
    setOpenNewNode: (open: boolean) => void
    setCurrentNode: (node: any) => void
    setPanelOpen: (open: boolean) => void
    setSketch: (sketch: Sketch | null) => void
    handleOpenIndividualModal: (id: string) => void
    setHandleOpenIndividualModal: (handler: (id: string) => void) => void
    handleDeleteSketch: () => Promise<void>
    setHandleDeleteSketch: (handler: () => Promise<void>) => void
    setOpenActionDialog: (open: boolean) => void
    useSketchData: (investigationId: string, sketchId: string) => SketchResults & {
        refetchAll: () => Promise<void>
    }
}

const isServer = typeof window === "undefined"

export const useSketchStore = create(
    persist<SketchState>(
        (set, get) => ({
            // UI State
            filters: {},
            settings: {
                showNodeLabel: true,
                showEdgeLabel: true,
                showMiniMap: true,
                showCopyIcon: true,
                showNodeToolbar: true,
            },
            openSettingsModal: false,
            currentNode: null,
            openNewNode: false,
            panelOpen: false,
            sketch: null,
            isRefetching: false,
            openActionDialog: false,
            setFilters: (filters) => set({ filters }),
            setSettings: (settings) => set({ settings }),
            setOpenSettingsModal: (open) => set({ openSettingsModal: open }),
            setOpenNewNode: (open) => set({ openNewNode: open }),
            setCurrentNode: (node) => set({ currentNode: node }),
            setPanelOpen: (open) => set({ panelOpen: open }),
            setSketch: (sketch) => set({ sketch }),
            setOpenActionDialog: (open) => set({ openActionDialog: open }),
            handleOpenIndividualModal: () => { },
            setHandleOpenIndividualModal: (handler) => set({ handleOpenIndividualModal: handler }),
            handleDeleteSketch: async () => { },
            setHandleDeleteSketch: (handler) => set({ handleDeleteSketch: handler }),
            useSketchData: (investigationId: string, sketchId: string) => {
                const wrapRefetch = async (refetch: () => Promise<QueryObserverResult>) => {
                    await refetch()
                }
                const sketchQuery = useQuery<Sketch>({
                    queryKey: ["investigations", investigationId, "sketches", sketchId],
                    queryFn: async () => {
                        const res = await fetch(`/api/investigations/${investigationId}/sketches/${sketchId}`)
                        if (!res.ok) throw new Error("Failed to fetch sketch.")
                        const data = await res.json()
                        return data.sketch as Sketch
                    },
                })
                return {
                    sketch: {
                        data: sketchQuery.data as Sketch,
                        isLoading: sketchQuery.isLoading,
                        refetch: () => wrapRefetch(sketchQuery.refetch),
                    },
                    refetchAll: () => wrapRefetch(sketchQuery.refetch),

                }
            },
        }),
        {
            name: "sketch-storage",
            storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
            partialize: (state) => ({
                ...state,
            }),
        },
    )
)