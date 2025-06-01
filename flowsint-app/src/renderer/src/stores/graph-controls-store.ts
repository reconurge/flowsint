import { create } from 'zustand';

type GraphControlsStore = {
    zoomToFit: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    setActions: (actions: Partial<GraphControlsStore>) => void;
};

export const useGraphControls = create<GraphControlsStore>((set) => ({
    zoomToFit: () => { },
    zoomIn: () => { },
    zoomOut: () => { },
    setActions: (actions) => set(actions),
}));
