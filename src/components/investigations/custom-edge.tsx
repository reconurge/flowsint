import { Chip, Card } from '@heroui/react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getStraightPath,
} from '@xyflow/react';
import { useInvestigationContext } from './investigation-provider';

export default function CustomEdge({ id, label, confidence_level, sourceX, sourceY, targetX, targetY }: { id: string, label: string, confidence_level: string, sourceX: number, sourceY: number, targetX: number, targetY: number }) {
    const [edgePath, labelX, labelY] = getStraightPath({
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
                    <Chip style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                        className="nodrag nopan text-xs px-1" size='sm' color="warning" variant="flat">{label} {confidence_level &&
                            <>{confidence_level}%</>}
                    </Chip>}
            </EdgeLabelRenderer >
        </>
    );
}