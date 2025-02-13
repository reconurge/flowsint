import React from 'react';
import { getBezierPath, Position } from '@xyflow/react';
import { getEdgeParams } from '@/lib/utils';

const FloatingConnectionLine = ({
    toX,
    toY,
    fromPosition,
    toPosition,
    fromNode,
}: {
    toX: number,
    toY: number,
    fromPosition: Position,
    toPosition: Position,
    fromNode: number,
}): any => {
    if (!fromNode) {
        return null;
    }

    const targetNode = {
        id: 'connection-target',
        measured: {
            width: 1,
            height: 1,
        },
        internals: {
            positionAbsolute: { x: toX, y: toY },
        },
    };

    const { sx, sy } = getEdgeParams(fromNode, targetNode);
    const [edgePath] = getBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: fromPosition,
        targetPosition: toPosition,
        targetX: toX,
        targetY: toY,
    });

    return (
        <g>
            <path
                fill="none"
                stroke="#222"
                strokeWidth={1.5}
                className="animated"
                d={edgePath}
            />
            <circle
                cx={toX}
                cy={toY}
                fill="#fff"
                r={3}
                stroke="#222"
                strokeWidth={1.5}
            />
        </g>
    );
}

export default FloatingConnectionLine;