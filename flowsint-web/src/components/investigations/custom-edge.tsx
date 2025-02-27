import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
} from '@xyflow/react';
import { useInvestigationStore } from '@/store/investigation-store';
import { Badge } from '@/components/ui/badge';

export default function CustomEdge(props: any) {
    const { id, label, confidence_level, sourceX, sourceY, targetX, targetY, style } = props
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
    });
    const { settings } = useInvestigationStore()
    return (
        <>
            <BaseEdge id={id} path={edgePath} style={style} />
            <EdgeLabelRenderer>
                {settings.showEdgeLabel &&
                    <Badge color={label === "relation" ? 'orange' : "blue"} style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        opacity: style?.opacity || 1
                    }}
                        className="nodrag nopan text-xs px-1">{label} {confidence_level &&
                            <>{confidence_level}%</>}
                    </Badge>}
            </EdgeLabelRenderer>
        </>
    );
}