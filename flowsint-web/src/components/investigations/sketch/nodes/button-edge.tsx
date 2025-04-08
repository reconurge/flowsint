
// ButtonEdge.tsx
import { ReactNode, memo } from "react";
import {
    BaseEdge,
    EdgeLabelRenderer,
    EdgeProps,
    getStraightPath,
    useStore,
} from "@xyflow/react";
import { zoomSelector } from "@/lib/utils";
import { useInvestigationStore } from "@/store/investigation-store";

// Mémorisation du composant ButtonEdge
export const ButtonEdge = memo(({
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    markerEnd,
    children,
}: EdgeProps & { children: ReactNode }) => {
    const [edgePath, labelX, labelY] = getStraightPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
    });

    const showContent = useStore(zoomSelector);
    const { settings } = useInvestigationStore(state => state)
    return (
        <>
            <BaseEdge className="opacity-30" path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                {settings.showEdgeLabel && showContent &&
                    <div
                        className="nodrag nopan pointer-events-auto absolute"
                        style={{
                            ...style,
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        }}
                    >
                        {children}
                    </div>}
            </EdgeLabelRenderer>
        </>
    );
});

ButtonEdge.displayName = "ButtonEdge";