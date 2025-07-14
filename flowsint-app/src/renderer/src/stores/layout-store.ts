import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LayoutStore {
    isOpenConsole: boolean
    isOpenPanel: boolean
    isOpenChat: boolean
    isOpenAnalysis: boolean
    chatWidth: number
    chatHeight: number
    toggleConsole: () => void
    togglePanel: () => void
    toggleChat: () => void
    toggleAnalysis: () => void
    closePanel: () => void
    openPanel: () => void
    closeChat: () => void
    openChat: () => void
    openAnalysis: () => void
    closeAnalysis: () => void
    setChatDimensions: (width: number, height: number) => void
    activeTab: string
    activeTransformTab: string
    setActiveTab: (tab: "entities" | "items" | string) => void
    setActiveTransformTab: (tab: "transforms" | "items" | string) => void
}

export const useLayoutStore = create<LayoutStore>()(
    persist(
        (set) => ({
            isOpenConsole: false,
            isOpenPanel: true,
            isOpenChat: false,
            isOpenAnalysis: false,
            chatWidth: 500,
            chatHeight: 600,
            activeTab: "entities",
            activeTransformTab: "transforms",
            toggleConsole: () => set((state) => ({ isOpenConsole: !state.isOpenConsole })),
            togglePanel: () => set((state) => ({ isOpenPanel: !state.isOpenPanel })),
            toggleChat: () => set((state) => ({ isOpenChat: !state.isOpenChat })),
            toggleAnalysis: () => set((state) => ({ isOpenAnalysis: !state.isOpenAnalysis })),
            closePanel: () => set({ isOpenPanel: false }),
            openPanel: () => set({ isOpenPanel: true }),
            closeChat: () => set({ isOpenChat: false }),
            openChat: () => set({ isOpenChat: true }),
            closeAnalysis: () => set({ isOpenAnalysis: false }),
            openAnalysis: () => set({ isOpenAnalysis: true }),
            setChatDimensions: (width: number, height: number) => set({ chatWidth: width, chatHeight: height }),
            setActiveTab: (tab: string) => set({ activeTab: tab }),
            setActiveTransformTab: (tab: string) => set({ activeTransformTab: tab }),
        }),
        {
            name: 'layout-storage',
            partialize: (state) => ({
                isOpenPanel: state.isOpenPanel,
                isOpenAnalysis: state.isOpenAnalysis,
                chatWidth: state.chatWidth,
                chatHeight: state.chatHeight,
                activeTab: state.activeTab,
                activeTransformTab: state.activeTransformTab,
            }),
        }
    )
) 
