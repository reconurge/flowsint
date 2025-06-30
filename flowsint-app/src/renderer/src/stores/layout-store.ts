import { create } from 'zustand'

interface LayoutStore {
    isOpenConsole: boolean
    isOpenPanel: boolean
    isOpenChat: boolean
    toggleConsole: () => void
    togglePanel: () => void
    toggleChat: () => void
    closePanel: () => void
    openPanel: () => void
    closeChat: () => void
    openChat: () => void
    activeTab: string
    activeTransformTab: string
    setActiveTab: (tab: "entities" | "items" | string) => void
    setActiveTransformTab: (tab: "transforms" | "items" | string) => void
}

export const useLayoutStore = create<LayoutStore>((set) => ({
    isOpenConsole: false,
    isOpenPanel: true,
    isOpenChat: false,
    activeTab: "entities",
    activeTransformTab: "transforms",
    toggleConsole: () => set((state) => ({ isOpenConsole: !state.isOpenConsole })),
    togglePanel: () => set((state) => ({ isOpenPanel: !state.isOpenPanel })),
    toggleChat: () => set((state) => ({ isOpenChat: !state.isOpenChat })),
    closePanel: () => set({ isOpenPanel: false }),
    openPanel: () => set({ isOpenPanel: true }),
    closeChat: () => set({ isOpenChat: false }),
    openChat: () => set({ isOpenChat: true }),
    setActiveTab: (tab: string) => set({ activeTab: tab }),
    setActiveTransformTab: (tab: string) => set({ activeTransformTab: tab }),
})) 
