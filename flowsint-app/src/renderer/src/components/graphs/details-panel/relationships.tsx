import { sketchService } from '@/api/sketch-service';
import Loader from '@/components/loader';
import { TypeBadge } from '@/components/type-badge';
import { Badge } from '@/components/ui/badge';
import { GraphEdge, GraphNode, useGraphStore } from '@/stores/graph-store'
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowRight } from 'lucide-react';
import { memo, useCallback, useRef } from 'react';

type Relation = {
    source: GraphNode,
    target: GraphNode,
    edge: { label: string }
}

const getInlineRelationships = (nodes: GraphNode[], edges: GraphEdge[]): Relation[] => {
    const relationships: Relation[] = []
    edges.forEach((edge) => {
        const source = nodes.find((n) => (n.id === edge.source))
        const target = nodes.find((n) => (n.id === edge.target))
        if (!target || !source) return
        relationships.push({ source, target, edge: { label: String(edge.caption || 'RELATED_TO') } })
    })
    return relationships
}

const Relationships = memo(({ sketchId, nodeId }: { sketchId: string, nodeId: string }) => {
    const { data: neighborsData, isLoading } = useQuery({
        queryKey: ['neighbors', sketchId, nodeId],
        queryFn: () => sketchService.getNodeNeighbors(sketchId, nodeId),
    });

    const parentRef = useRef<HTMLDivElement>(null);
    const relationships = getInlineRelationships(neighborsData?.nds || [], neighborsData?.rls || []);

    const rowVirtualizer = useVirtualizer({
        count: relationships.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40, // Estimate height of each relationship item
        overscan: 5,
    });

    if (isLoading) return <div className='flex items-center justify-center grow h-full'><Loader /></div>

    return (
        <div ref={parentRef} className="h-full overflow-auto py-3">
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const rel = relationships[virtualRow.index];
                    return (
                        <div
                            key={virtualRow.index}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="mb-1 px-3"
                        >
                            <Badge variant={"outline"} className='h-8 truncate justify-between text-ellipsis text-sm w-full'>
                                <RelationshipItem node={rel.source} />
                                <ArrowRight />
                                <span className='opacity-60 text-xs truncate text-ellipsis'>{rel.edge.label}</span>
                                <ArrowRight />
                                <RelationshipItem node={rel.target} />
                            </Badge>
                        </div>
                    );
                })}
            </div>
        </div>
    )
})

export default Relationships


const RelationshipItem = memo(({ node }: { node: GraphNode }) => {
    const setCurrentNode = useGraphStore(s => s.setCurrentNode)
    const handleClick = useCallback(() => {
        setCurrentNode(node)
    }, [setCurrentNode])
    return (
        <button className='truncate text-ellipsis' onClick={handleClick}>
            <TypeBadge className='hover:underline cursor-pointer truncate text-ellipsis' type={node.data.type}>{node.data.label}</TypeBadge>
        </button>
    )
})