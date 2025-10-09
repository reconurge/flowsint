import { create } from 'zustand'

interface GraphNavigationState {
  activeTab: string
  setActiveTab: (tab: string) => void
  resetTabs: () => void
}

export const useGraphNavigationStore = create<GraphNavigationState>((set) => ({
  activeTab: 'entities',
  setActiveTab: (tab: string) => set({ activeTab: tab }),
  resetTabs: () => set({ activeTab: 'entities' })
}))
