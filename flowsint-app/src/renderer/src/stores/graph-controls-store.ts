import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type GraphControlsStore = {
    view: 'force' | 'hierarchy' | 'table' | 'map' | 'relationships';
    isLassoActive: boolean;
    zoomToFit: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    onLayout: (layout: any) => void;
    setActions: (actions: Partial<GraphControlsStore>) => void;
    refetchGraph: () => void;
    setView: (view: 'force' | 'hierarchy' | 'table' | 'map' | 'relationships') => void;
    setIsLassoActive: (active: boolean) => void
};

export const useGraphControls = create<GraphControlsStore>()(
    persist(
        (set) => ({
            view: 'hierarchy',
            isLassoActive: false,
            zoomToFit: () => { },
            zoomIn: () => { },
            zoomOut: () => { },
            onLayout: () => { },
            setActions: (actions) => set(actions),
            refetchGraph: () => { },
            setView: (view) => set({ view }),
            setIsLassoActive: (active) => set({ isLassoActive: active })
        }),
        {
            name: 'graph-controls-storage',
            partialize: (state) => ({ view: state.view }),
        }
    )
);
