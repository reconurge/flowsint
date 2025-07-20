import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type GraphControlsStore = {
    view: 'force' | 'hierarchy' | 'table' | 'map' | 'relationships';
    zoomToFit: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    onLayout: (layout: any) => void;
    setActions: (actions: Partial<GraphControlsStore>) => void;
    refetchGraph: () => void;
    setView: (view: 'force' | 'hierarchy' | 'table' | 'map' | 'relationships') => void;
};

export const useGraphControls = create<GraphControlsStore>()(
    persist(
        (set) => ({
            view: 'hierarchy',
            zoomToFit: () => { },
            zoomIn: () => { },
            zoomOut: () => { },
            onLayout: () => { },
            setActions: (actions) => set(actions),
            refetchGraph: () => { },
            setView: (view) => set({ view }),
        }),
        {
            name: 'graph-controls-storage',
            partialize: (state) => ({ view: state.view }),
        }
    )
);
