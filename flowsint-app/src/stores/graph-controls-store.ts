import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewType = 'hierarchy' | 'force' | 'table' | 'map' | 'relationships'
type LayoutMode = 'none' | 'force' | 'dagre'

type GraphControlsStore = {
  view: ViewType
  layoutMode: LayoutMode
  isLassoActive: boolean
  zoomToFit: () => void
  zoomIn: () => void
  zoomOut: () => void
  onLayout: (layout: any) => void
  setActions: (actions: Partial<GraphControlsStore>) => void
  refetchGraph: () => void
  setView: (view: ViewType) => void
  setLayoutMode: (mode: LayoutMode) => void
  setIsLassoActive: (active: boolean) => void
}

export const useGraphControls = create<GraphControlsStore>()(
  persist(
    (set) => ({
      view: 'force',
      layoutMode: 'none',
      isLassoActive: false,
      zoomToFit: () => { },
      zoomIn: () => { },
      zoomOut: () => { },
      onLayout: () => { },
      setActions: (actions) => set(actions),
      refetchGraph: () => { },
      setView: (view) => set({ view }),
      setLayoutMode: (mode) => set({ layoutMode: mode }),
      setIsLassoActive: (active) => set({ isLassoActive: active })
    }),
    {
      name: 'graph-controls-storage',
      partialize: (state) => ({ view: state.view, layoutMode: state.layoutMode })
    }
  )
)
