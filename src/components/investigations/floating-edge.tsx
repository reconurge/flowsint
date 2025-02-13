import { getEdgeParams } from '@/src/lib/utils';
import {
    EdgeLabelRenderer,
    getBezierPath,
    useInternalNode
} from '@xyflow/react';
import { useInvestigationContext } from '../contexts/investigation-provider';
import { Badge } from '@radix-ui/themes';
function FloatingEdge(props: any) {
    const { id, source, target, markerEnd, label, confidence_level, sourceX, sourceY, targetX, targetY, style } = props
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    const { settings } = useInvestigationContext()

    if (!sourceNode || !targetNode) {
        return null;
    }

    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
        sourceNode,
        targetNode,
    );

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetPosition: targetPos,
        targetX: tx,
        targetY: ty,
    });

    return (
        <>
            <path
                id={id}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
                style={style}
            />
            <EdgeLabelRenderer>
                {settings.showEdgeLabel &&
                    <Badge size={"1"} color={label === "relation" ? 'orange' : "blue"} style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        opacity: style?.opacity || 1
                    }}
                        className="nodrag nopan !text-[.6rem] !px-1 !py-0">{label} {confidence_level &&
                            <>{confidence_level}%</>}
                    </Badge>}
            </EdgeLabelRenderer></>

    );
}

export default FloatingEdge;


