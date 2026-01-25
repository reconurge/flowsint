import { sketchService } from '@/api/sketch-service'
import Loader from '@/components/loader'
import { TypeBadge } from '@/components/type-badge'
import { Badge } from '@/components/ui/badge'
import { useGraphStore } from '@/stores/graph-store'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { memo, useCallback, useRef } from 'react'
import { GraphEdge, GraphNode } from '@/types'
import { useVirtualizer } from '@tanstack/react-virtual'

const ITEM_HEIGHT = 36 // 32px badge height + 4px gap

type Relation = {
  source: GraphNode
  target: GraphNode
  edge: { label: string }
}

const getInlineRelationships = (nodes: GraphNode[], edges: GraphEdge[]): Relation[] => {
  const relationships: Relation[] = []
  edges.forEach((edge) => {
    const source = nodes.find((n) => n.id === edge.source)
    const target = nodes.find((n) => n.id === edge.target)
    if (!target || !source) return
    relationships.push({ source, target, edge: { label: String(edge.caption || 'RELATED_TO') } })
  })
  return relationships
}

const Relationships = memo(
  ({ sketchId, nodeId, nodeLength }: { sketchId: string; nodeId: string; nodeLength: number }) => {
    const { data: neighborsData, isLoading } = useQuery({
      queryKey: ['neighbors', sketchId, nodeId, nodeLength],
      queryFn: () => sketchService.getNodeNeighbors(sketchId, nodeId)
    })

    const relationships = getInlineRelationships(neighborsData?.nds || [], neighborsData?.rls || [])

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader />
        </div>
      )
    }

    if (relationships.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          No relationships found
        </div>
      )
    }

    return <VirtualizedList relationships={relationships} />
  }
)

const VirtualizedList = memo(({ relationships }: { relationships: Relation[] }) => {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: relationships.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5
  })

  const virtualItems = virtualizer.getVirtualItems()

  console.log('VirtualizedList Debug:', {
    relationshipsCount: relationships.length,
    totalSize: virtualizer.getTotalSize(),
    virtualItemsCount: virtualItems.length,
    firstItem: virtualItems[0],
    parentRefCurrent: parentRef.current
  })
  const totalSize = virtualizer.getTotalSize()

  return (
    <div ref={parentRef} className="h-full py-1.5 overflow-auto">
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
          paddingTop: '0.75rem',
          paddingBottom: '0.75rem'
        }}
      >
        {virtualItems.map((virtualRow) => {
          const rel = relationships[virtualRow.index]

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
              className="pb-1 px-1"
            >
              <Badge variant={'outline'} className="h-8 px-2 py-1 w-full block">
                <div className="flex items-center gap-1 w-full min-w-0 h-full">
                  <div className="min-w-0 flex-1 flex items-center">
                    <RelationshipItem node={rel.source} />
                  </div>
                  <ArrowRight className="shrink-0 opacity-60 h-4 w-4" />
                  <div className="min-w-0 flex-1 flex items-center justify-center">
                    <span className="opacity-60 text-xs truncate block">{rel.edge.label}</span>
                  </div>
                  <ArrowRight className="shrink-0 opacity-60 h-4 w-4" />
                  <div className="min-w-0 flex-1 flex items-center justify-end">
                    <RelationshipItem node={rel.target} />
                  </div>
                </div>
              </Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default Relationships

const RelationshipItem = memo(({ node }: { node: GraphNode }) => {
  const setCurrentNodeId = useGraphStore((s) => s.setCurrentNodeId)
  const handleClick = useCallback(() => {
    setCurrentNodeId(node.id)
  }, [setCurrentNodeId, node.id])
  return (
    <button
      className="w-full h-full text-left hover:underline cursor-pointer flex items-center"
      onClick={handleClick}
    >
      <TypeBadge className="w-full truncate block text-center" type={node.nodeType}>
        {node.nodeLabel}
      </TypeBadge>
    </button>
  )
})
