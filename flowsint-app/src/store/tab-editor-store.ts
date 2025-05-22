import { create } from "zustand"
import { v4 as uuidv4 } from "uuid"
import { persist } from "zustand/middleware"

export interface GraphTab {
    id: string
    title: string
    data: any
    isDirty?: boolean
}

interface GraphStore {
    tabs: GraphTab[]

    addTab: (id: string, title?: string, data?: any) => string
    closeTab: (id: string) => void
    updateTabData: (id: string, data: any) => void
    markTabDirty: (id: string, isDirty?: boolean) => void
}

export const useTabEditorStore = create<GraphStore>()(
    persist(
        (set) => ({
            tabs: [],

            addTab: (id = uuidv4(), title = "New Graph", data = {}) => {
                const newTab = { id, title, data, isDirty: false }

                set((state) => ({
                    tabs: [...state.tabs, newTab],
                }))

                return id
            },

            closeTab: (id: string) => {
                set((state) => ({
                    tabs: state.tabs.filter((tab) => tab.id !== id),
                }))
            },

            updateTabData: (id: string, data: any) => {
                set((state) => ({
                    tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, data } : tab)),
                }))
            },

            markTabDirty: (id: string, isDirty = true) => {
                set((state) => ({
                    tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, isDirty } : tab)),
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
