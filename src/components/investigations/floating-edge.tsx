import { getEdgeParams } from '@/lib/utils';
import {
    EdgeLabelRenderer,
    getStraightPath,
    useInternalNode
} from '@xyflow/react';
import { useInvestigationStore } from '@/store/investigation-store';
import { Badge } from '@/components/ui/badge';
function FloatingEdge(props: any) {
    const { id, source, target, markerEnd, label, confidence_level, sourceX, sourceY, targetX, targetY, style } = props
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    const { settings } = useInvestigationStore()

    if (!sourceNode || !targetNode) {
        return null;
    }

    const { sx, sy, tx, ty } = getEdgeParams(
        sourceNode,
        targetNode,
    );

    const [edgePath, labelX, labelY] = getStraightPath({
        sourceX: sx,
        sourceY: sy,
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
                    <Badge color={label === "relation" ? 'orange' : "blue"} style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        opacity: style?.opacity || 1
                    }}
                        className="nodrag nopan bg-primary/80 backdrop-blur leading-3.5 border border-primary !text-[.6rem] !px-1 !py-0">{label} {confidence_level &&
                            <>{confidence_level}%</>}
                    </Badge>}
            </EdgeLabelRenderer></>

    );
}

export default FloatingEdge;


