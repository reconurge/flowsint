import { create } from 'zustand';

type GraphControlsStore = {
    view: 'force' | 'hierarchy';
    zoomToFit: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    onLayout: (layout: any) => void;
    setActions: (actions: Partial<GraphControlsStore>) => void;
    refetchGraph: () => void;
    setView: (view: 'force' | 'hierarchy') => void;
};

export const useGraphControls = create<GraphControlsStore>((set) => ({
    view: 'hierarchy',
    zoomToFit: () => { },
    zoomIn: () => { },
    zoomOut: () => { },
    onLayout: () => { },
    setActions: (actions) => set(actions),
    refetchGraph: () => { },
    setView: (view) => set({ view }),
}));
