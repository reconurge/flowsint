import { create } from "zustand"
import { v4 as uuidv4 } from "uuid"
import { persist } from "zustand/middleware"

export interface GraphTab {
    id: string // == graphId ou wallId
    title: string
    data: any
    type: "graph" | "wall"
    investigationId: string
    isDirty?: boolean
}

interface GraphStore {
    tabs: GraphTab[]

    addTab: (params: {
        id?: string
        title?: string
        data?: any
        investigationId: string
        type: "graph" | "wall"
    }) => string

    closeTab: (id: string) => void
    updateTabData: (id: string, data: any) => void
    markTabDirty: (id: string, isDirty?: boolean) => void
}

export const useTabEditorStore = create<GraphStore>()(
    persist(
        (set) => ({
            tabs: [],

            addTab: ({
                id = uuidv4(),
                title = "New Graph",
                data = {},
                investigationId,
                type,
            }) => {
                const newTab: GraphTab = {
                    id,
                    title,
                    data,
                    investigationId,
                    type,
                    isDirty: false,
                }

                set((state) => ({
                    tabs: [...state.tabs, newTab],
                }))

                return id
            },

            closeTab: (id) => {
                set((state) => ({
                    tabs: state.tabs.filter((tab) => tab.id !== id),
                }))
            },

            updateTabData: (id, data) => {
                set((state) => ({
                    tabs: state.tabs.map((tab) =>
                        tab.id === id ? { ...tab, data } : tab,
                    ),
                }))
            },

            markTabDirty: (id, isDirty = true) => {
                set((state) => ({
                    tabs: state.tabs.map((tab) =>
                        tab.id === id ? { ...tab, isDirty } : tab,
                    ),
                }))
            },
        }),
        {
            name: "graph-tabs-storage",
            partialize: (state) => ({
                tabs: state.tabs,
            }),
        },
    ),
)
