import { getBezierPath } from '@xyflow/react';
import { getEdgeParams } from '@/lib/utils';
import { memo, useMemo } from 'react';
import { Position, Node } from '@xyflow/react';

interface FloatingConnectionLineProps {
    toX: number;
    toY: number;
    fromPosition: Position;
    toPosition: Position;
    fromNode: Node;
}

const FloatingConnectionLine = memo(function FloatingConnectionLine({
    toX,
    toY,
    fromPosition,
    toPosition,
    fromNode,
}: FloatingConnectionLineProps) {
    if (!fromNode) {
        return null;
    }

    // Create a mock target node at the cursor position
    const targetNode = useMemo(() => ({
        id: 'connection-target',
        measured: {
            width: 1,
            height: 1,
        },
        internals: {
            positionAbsolute: { x: toX, y: toY },
        },
    }), [toX, toY]);

    const { sx, sy, tx, ty, sourcePos, targetPos } = useMemo(() => getEdgeParams(
        fromNode as Node & { 
            internals: { positionAbsolute: { x: number; y: number } };
            measured: { width: number; height: number };
        },
        targetNode,
    ), [fromNode, targetNode]);

    const [edgePath] = useMemo(() => getBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos || fromPosition,
        targetPosition: targetPos || toPosition,
        targetX: tx || toX,
        targetY: ty || toY,
    }), [sx, sy, sourcePos, fromPosition, targetPos, toPosition, tx, toX, ty, toY]);

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
                cx={tx || toX}
                cy={ty || toY}
                fill="#fff"
                r={3}
                stroke="#222"
                strokeWidth={1.5}
            />
        </g>
    );
});

export default FloatingConnectionLine;