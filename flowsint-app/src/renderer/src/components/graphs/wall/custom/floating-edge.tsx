import { getStraightPath, useInternalNode } from '@xyflow/react';
import { getEdgeParams } from '@/lib/utils';
import { memo } from 'react';

interface FloatingEdgeProps {
    id: string;
    source: string;
    target: string;
    markerEnd?: string;
    style?: React.CSSProperties;
}

const FloatingEdge = memo(function FloatingEdge({ id, source, target, markerEnd, style }: FloatingEdgeProps) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    if (!sourceNode || !targetNode) {
        return null;
    }

    const { sx, sy, tx, ty } = getEdgeParams(
        //@ts-ignore
        sourceNode,
        targetNode,
    );

    const [edgePath] = getStraightPath({
        sourceX: sx,
        sourceY: sy,
        targetX: tx,
        targetY: ty,
    });

    return (
        <path
            id={id}
            className="react-flow__edge-path"
            d={edgePath}
            markerEnd={markerEnd}
            style={style}
        />
    );
});

export default FloatingEdge;