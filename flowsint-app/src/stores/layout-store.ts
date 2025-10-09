import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LayoutStore {
  isOpenConsole: boolean
  isOpenPanel: boolean
  isOpenDetails: boolean
  isOpenChat: boolean
  isOpenAnalysis: boolean
  chatWidth: number
  chatHeight: number
  toggleConsole: () => void
  togglePanel: () => void
  toggleChat: () => void
  toggleDetails: () => void
  toggleAnalysis: () => void
  closePanel: () => void
  openPanel: () => void
  closeChat: () => void
  openChat: () => void
  openDetails: () => void
  closeDetails: () => void
  setChatDimensions: (width: number, height: number) => void
  activeTab: string
  activeTransformTab: string
  setActiveTab: (tab: 'entities' | 'items' | string) => void
  setActiveTransformTab: (tab: 'transforms' | 'items' | string) => void
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      isOpenConsole: false,
      isOpenPanel: true,
      isOpenDetails: false,
      isOpenChat: false,
      isOpenAnalysis: false,
      chatWidth: 500,
      chatHeight: 600,
      activeTab: 'entities',
      activeTransformTab: 'transforms',
      toggleConsole: () => set((state) => ({ isOpenConsole: !state.isOpenConsole })),
      togglePanel: () => set((state) => ({ isOpenPanel: !state.isOpenPanel })),
      toggleDetails: () => set((state) => ({ isOpenDetails: !state.isOpenDetails })),
      toggleChat: () => set((state) => ({ isOpenChat: !state.isOpenChat })),
      toggleAnalysis: () => set((state) => ({ isOpenAnalysis: !state.isOpenAnalysis })),
      closePanel: () => set({ isOpenPanel: false }),
      openPanel: () => set({ isOpenPanel: true }),
      closeChat: () => set({ isOpenChat: false }),
      openChat: () => set({ isOpenChat: true }),
      closeDetails: () => set({ isOpenAnalysis: false }),
      openDetails: () => set({ isOpenAnalysis: true }),
      setChatDimensions: (width: number, height: number) =>
        set({ chatWidth: width, chatHeight: height }),
      setActiveTab: (tab: string) => set({ activeTab: tab }),
      setActiveTransformTab: (tab: string) => set({ activeTransformTab: tab })
    }),
    {
      name: 'layout-storage',
      partialize: (state) => ({
        isOpenPanel: state.isOpenPanel,
        isOpenAnalysis: state.isOpenAnalysis,
        isOpenDetails: state.isOpenDetails,
        chatWidth: state.chatWidth,
        chatHeight: state.chatHeight,
        activeTab: state.activeTab,
        activeTransformTab: state.activeTransformTab
      })
    }
  )
)
