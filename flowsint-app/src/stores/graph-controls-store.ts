import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewType = 'graph' | 'table' | 'map' | 'relationships'

type GraphControlsStore = {
  view: ViewType
  isLassoActive: boolean
  zoomToFit: () => void
  zoomIn: () => void
  zoomOut: () => void
  onLayout: (layout: any) => void
  setActions: (actions: Partial<GraphControlsStore>) => void
  refetchGraph: () => void
  regenerateLayout: (layoutType: 'force' | 'hierarchy') => void
  setView: (view: 'graph' | 'table' | 'map' | 'relationships') => void
  setIsLassoActive: (active: boolean) => void
}

export const useGraphControls = create<GraphControlsStore>()(
  persist(
    (set) => ({
      view: 'graph',
      isLassoActive: false,
      zoomToFit: () => { },
      zoomIn: () => { },
      zoomOut: () => { },
      onLayout: () => { },
      setActions: (actions) => set(actions),
      refetchGraph: () => { },
      regenerateLayout: () => { },
      setView: (view) => set({ view }),
      setIsLassoActive: (active) => set({ isLassoActive: active })
    }),
    {
      name: 'graph-controls-storage',
      partialize: (state) => ({ view: state.view })
    }
  )
)
