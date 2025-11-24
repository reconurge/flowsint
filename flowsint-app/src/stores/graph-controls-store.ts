import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewType = 'graph' | 'table' | 'map' | 'relationships'
type LayoutType = 'force' | 'hierarchy'

type GraphControlsStore = {
  view: ViewType
  isLassoActive: boolean
  currentLayoutType: LayoutType
  zoomToFit: () => void
  zoomIn: () => void
  zoomOut: () => void
  onLayout: (layout: any) => void
  setActions: (actions: Partial<GraphControlsStore>) => void
  refetchGraph: () => void
  regenerateLayout: (layoutType: LayoutType) => void
  setCurrentLayoutType: (layoutType: LayoutType) => void
  setView: (view: 'graph' | 'table' | 'map' | 'relationships') => void
  setIsLassoActive: (active: boolean) => void
}

export const useGraphControls = create<GraphControlsStore>()(
  persist(
    (set) => ({
      view: 'graph',
      isLassoActive: false,
      currentLayoutType: 'force',
      zoomToFit: () => { },
      zoomIn: () => { },
      zoomOut: () => { },
      onLayout: () => { },
      setActions: (actions) => set(actions),
      refetchGraph: () => { },
      regenerateLayout: () => { },
      setCurrentLayoutType: (layoutType) => set({ currentLayoutType: layoutType }),
      setView: (view) => set({ view }),
      setIsLassoActive: (active) => set({ isLassoActive: active })
    }),
    {
      name: 'graph-controls-storage',
      partialize: (state) => ({
        view: state.view,
        currentLayoutType: state.currentLayoutType
      })
    }
  )
)
