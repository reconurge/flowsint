import { Chip, Card } from '@heroui/react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
} from '@xyflow/react';
import { useInvestigationContext } from './investigation-provider';
import { Badge } from '@radix-ui/themes';

export default function CustomEdge({ id, label, confidence_level, sourceX, sourceY, targetX, targetY }: { id: string, label: string, confidence_level: string, sourceX: number, sourceY: number, targetX: number, targetY: number }) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
    });

    const { settings } = useInvestigationContext()
    return (
        <>
            <BaseEdge id={id} path={edgePath} />
            <EdgeLabelRenderer>
                {settings.showEdgeLabel &&
                    <Badge size={"1"} color={label === "relation" ? 'orange' : "blue"} style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                        className="nodrag nopan text-xs px-1">{label} {confidence_level &&
                            <>{confidence_level}%</>}
                    </Badge>}
            </EdgeLabelRenderer>
        </>
    );
}