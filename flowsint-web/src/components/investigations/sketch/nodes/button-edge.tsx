import { ReactNode } from "react";

import {
    BaseEdge,
    EdgeLabelRenderer,
    EdgeProps,
    getBezierPath,
    getStraightPath,
} from "@xyflow/react";

export const ButtonEdge = ({
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

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
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
};