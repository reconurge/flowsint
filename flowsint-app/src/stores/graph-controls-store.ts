import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewType = 'graph' | 'table' | 'map' | 'relationships'
type LayoutType = 'force' | 'hierarchy'
type SelectionMode = 'lasso' | 'rectangle'

type GraphControlsStore = {
  view: ViewType
  isSelectorModeActive: boolean
  selectionMode: SelectionMode
  currentLayoutType: LayoutType
  zoomToFit: () => void
  zoomIn: () => void
  zoomOut: () => void
  zoomToSelection: () => void
  centerOnNode: (x: number, y: number) => void
  onLayout: (layout: any) => void
  setActions: (actions: Partial<GraphControlsStore>) => void
  refetchGraph: (onSuccess?: () => void) => void
  regenerateLayout: (layoutType: LayoutType) => void
  getViewportCenter: () => { x: number; y: number } | null
  setCurrentLayoutType: (layoutType: LayoutType) => void
  setView: (view: 'graph' | 'table' | 'map' | 'relationships') => void
  setIsSelectorModeActive: (active: boolean) => void
  setSelectionMode: (mode: SelectionMode) => void
}

export const useGraphControls = create<GraphControlsStore>()(
  persist(
    (set) => ({
      view: 'graph',
      isSelectorModeActive: false,
      selectionMode: 'lasso',
      currentLayoutType: 'force',
      zoomToFit: () => {},
      zoomIn: () => {},
      zoomOut: () => {},
      zoomToSelection: () => {},
      centerOnNode: () => {},
      onLayout: () => {},
      setActions: (actions) => set(actions),
      refetchGraph: (onSuccess) => {},
      regenerateLayout: () => {},
      getViewportCenter: () => null,
      setCurrentLayoutType: (layoutType) => set({ currentLayoutType: layoutType }),
      setView: (view) => set({ view }),
      setIsSelectorModeActive: (active) => set({ isSelectorModeActive: active }),
      setSelectionMode: (mode) => set({ selectionMode: mode }),
    }),
    {
      name: 'graph-controls-storage',
      partialize: (state) => ({
        view: state.view,
        currentLayoutType: state.currentLayoutType,
        selectionMode: state.selectionMode
      })
    }
  )
)
