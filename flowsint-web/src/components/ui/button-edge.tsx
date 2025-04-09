
// ButtonEdge.tsx
import { ReactNode, memo } from "react";
import {
    BaseEdge,
    EdgeLabelRenderer,
    EdgeProps,
    getSimpleBezierPath,
    // useStore,
} from "@xyflow/react";
export const ButtonEdge = memo(({
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    markerEnd,
    children,
}: EdgeProps & { children: ReactNode }) => {
    const [edgePath, labelX, labelY] = getSimpleBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
    });
    return (
        <>
            <BaseEdge className="opacity-30" path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                <div
                    className="nodrag nopan pointer-events-auto absolute"
                    style={{
                        ...style,
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                    }}
                >
                    {children}
                </div>
            </EdgeLabelRenderer>
        </>
    );
});

ButtonEdge.displayName = "ButtonEdge";