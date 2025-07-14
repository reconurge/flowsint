import { useCallback, useRef } from 'react';

export interface ForceGraphControls {
    zoomIn: () => void;
    zoomOut: () => void;
    zoomToFit: () => void;
    resetZoom: () => void;
}

export const useForceGraphControls = () => {
    const graphRef = useRef<any>();

    const setGraphRef = useCallback((ref: any) => {
        graphRef.current = ref;
    }, []);

    const zoomIn = useCallback(() => {
        if (graphRef.current) {
            const zoom = graphRef.current.zoom();
            graphRef.current.zoom(zoom * 1.5);
        }
    }, []);

    const zoomOut = useCallback(() => {
        if (graphRef.current) {
            const zoom = graphRef.current.zoom();
            graphRef.current.zoom(zoom * 0.75);
        }
    }, []);

    const zoomToFit = useCallback(() => {
        if (graphRef.current) {
            graphRef.current.zoomToFit(400);
        }
    }, []);

    const resetZoom = useCallback(() => {
        if (graphRef.current) {
            graphRef.current.zoom(1);
            graphRef.current.centerAt(0, 0);
        }
    }, []);

    const controls: ForceGraphControls = {
        zoomIn,
        zoomOut,
        zoomToFit,
        resetZoom,
    };

    return {
        controls,
        setGraphRef,
    };
}; 