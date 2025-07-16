import { getSmoothStepPath, useInternalNode } from '@xyflow/react';

import { getEdgeParams } from '@/lib/utils';

function SimpleFloatingEdge({ id, source, target, markerEnd, style }) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    if (!sourceNode || !targetNode) {
        return null;
    }

    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
        {
            ...sourceNode,
            measured: {
                width: sourceNode.measured?.width ?? 150,
                height: sourceNode.measured?.height ?? 40,
            },
        },
        {
            ...targetNode,
            measured: {
                width: targetNode.measured?.width ?? 150,
                height: targetNode.measured?.height ?? 40,
            },
        },
    );

    const [edgePath] = getSmoothStepPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetPosition: targetPos,
        targetX: tx,
        targetY: ty,
    });

    return (
        <path
            id={id}
            className="react-flow__edge-path"
            d={edgePath}
            strokeWidth={5}
            markerEnd={markerEnd}
            style={style}
        />
    );
}

export default SimpleFloatingEdge;