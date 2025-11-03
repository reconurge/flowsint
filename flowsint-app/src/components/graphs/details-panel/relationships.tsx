import { sketchService } from '@/api/sketch-service'
import Loader from '@/components/loader'
import { TypeBadge } from '@/components/type-badge'
import { Badge } from '@/components/ui/badge'
import { useGraphStore } from '@/stores/graph-store'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { memo, useCallback } from 'react'
import { GraphEdge, GraphNode } from '@/types'

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

    if (isLoading)
      return (
        <div className="flex items-center justify-center grow h-full">
          <Loader />
        </div>
      )

    return (
      <div className="h-full overflow-auto py-3 px-3 space-y-1">
        {relationships.map((rel, index) => (
          <Badge key={index} variant={'outline'} className="h-8 px-2 py-1 w-full">
            <div className="flex items-center gap-1 w-full min-w-0 h-full">
              <div className="min-w-0 flex-1 flex items-center">
                <RelationshipItem node={rel.source} />
              </div>
              <ArrowRight className="flex-shrink-0 opacity-60 h-4 w-4" />
              <div className="min-w-0 flex-1 flex items-center justify-center">
                <span className="opacity-60 text-xs truncate block">{rel.edge.label}</span>
              </div>
              <ArrowRight className="flex-shrink-0 opacity-60 h-4 w-4" />
              <div className="min-w-0 flex-1 flex items-center justify-end">
                <RelationshipItem node={rel.target} />
              </div>
            </div>
          </Badge>
        ))}
      </div>
    )
  }
)

export default Relationships

const RelationshipItem = memo(({ node }: { node: GraphNode }) => {
  const setCurrentNode = useGraphStore((s) => s.setCurrentNode)
  const handleClick = useCallback(() => {
    setCurrentNode(node)
  }, [setCurrentNode])
  return (
    <button
      className="w-full h-full text-left hover:underline cursor-pointer flex items-center"
      onClick={handleClick}
    >
      <TypeBadge className="w-full truncate block text-center" type={node.data.type}>
        {node.data.label}
      </TypeBadge>
    </button>
  )
})
