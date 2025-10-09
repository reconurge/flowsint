import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { sketchService } from '@/api/sketch-service'
import { useGraphStore } from '@/stores/graph-store'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Search, ArrowRight, Users, Link, Filter } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useIcon } from '@/hooks/use-icon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { CopyButton } from '../copy'
import { RelationshipType } from '@/types'
import { GraphNode } from '@/types'

const ITEM_HEIGHT = 67 // Balanced spacing between items (55px card + 12px padding)

// Separate component for relationship item to avoid hook order issues
interface RelationshipItemProps {
  relationship: RelationshipType
  style: React.CSSProperties
  onNodeClick: (node: GraphNode) => void
}

function RelationshipItem({ relationship, style, onNodeClick }: RelationshipItemProps) {
  const SourceIcon = useIcon(relationship.source.data?.type, relationship.source.data?.src)
  const TargetIcon = useIcon(relationship.target.data?.type, relationship.target.data?.src)

  const handleNodeClickSource = useCallback(() => {
    onNodeClick(relationship.source)
  }, [])
  const handleNodeClickTarget = useCallback(() => {
    onNodeClick(relationship.target)
  }, [])

  return (
    <div style={style} className="px-4 pb-2">
      <Card className="h-[55px] hover:shadow-md transition-shadow duration-200 p-0">
        <CardContent className="p-3 h-[55px] flex items-center gap-2 min-w-0">
          {/* Source Node */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted flex-shrink-0">
              <SourceIcon className="h-4 w-4" />
            </div>
            <button
              onClick={handleNodeClickSource}
              className="font-medium text-sm hover:text-primary hover:underline cursor-pointer text-left max-w-full"
            >
              <span className="block truncate">
                {relationship.source.data?.label ?? relationship.source.id}
              </span>
            </button>
            <CopyButton content={relationship.source.data?.label ?? relationship.source.id} />
          </div>

          {/* Relationship Arrow */}
          <div className="flex items-center justify-center px-2 flex-shrink-0 min-w-0 grow">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="h-px bg-muted-foreground/30 flex-1"></div>
              <span className="px-2 py-1 bg-muted/50 rounded-sm truncate">
                {relationship.edge.label}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            </div>
          </div>

          {/* Target Node */}
          <div className="flex items-center gap-2 flex-1 justify-end min-w-0 truncate text-ellipsis">
            <CopyButton content={relationship.target.data?.label ?? relationship.target.id} />
            <button
              onClick={handleNodeClickTarget}
              className="font-medium text-sm hover:text-primary hover:underline cursor-pointer max-w-full text-right"
            >
              <span className="block truncate">
                {relationship.target.data?.label || relationship.target.id}
              </span>
            </button>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted flex-shrink-0">
              <TargetIcon className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RelationshipsTable() {
  const { id: sketchId } = useParams({
    from: '/_auth/dashboard/investigations/$investigationId/$type/$id'
  })
  const { data: relationships, isLoading } = useQuery({
    queryKey: ['graph', 'relationships_view', sketchId],
    enabled: Boolean(sketchId),
    queryFn: () => sketchService.getGraphDataById(sketchId as string, true)
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const parentRef = useRef<HTMLDivElement>(null)
  const setCurrentNode = useGraphStore((s) => s.setCurrentNode)
  // const setOpenNodeEditorModal = useGraphStore(s => s.setOpenNodeEditorModal)

  const onNodeClick = useCallback(
    (node: GraphNode) => {
      setCurrentNode(node)
      // setOpenNodeEditorModal(true)
    },
    [
      setCurrentNode
      // setOpenNodeEditorModal
    ]
  )

  // Filter relationships based on search and type
  const filteredRelationships = useMemo(() => {
    if (!relationships) return []

    return relationships.filter((rel: RelationshipType) => {
      const matchesSearch =
        searchQuery === '' ||
        rel.source.data?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rel.target.data?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rel.edge.label?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType =
        selectedType === 'all' ||
        rel.source.data?.type === selectedType ||
        rel.target.data?.type === selectedType

      return matchesSearch && matchesType
    })
  }, [relationships, searchQuery, selectedType])

  // Get unique node types for filter
  const nodeTypes = useMemo(() => {
    if (!relationships) return []
    const types = new Set<string>()
    relationships.forEach((rel: RelationshipType) => {
      if (rel.source.data?.type) types.add(rel.source.data.type)
      if (rel.target.data?.type) types.add(rel.target.data.type)
    })
    return Array.from(types).sort()
  }, [relationships])

  const virtualizer = useVirtualizer({
    count: filteredRelationships.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5
  })

  if (isLoading) {
    return (
      <div className="w-full p-4 px-6 space-y-4 pt-18">
        {/* Header with stats */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Relationships</h2>
            <p className="text-muted-foreground">
              <Skeleton className="h-4 w-32 inline-block" />
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <Skeleton className="h-4 w-8" />
          </Badge>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search relationships, nodes, or types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled
            />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType} disabled>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Skeleton List */}
        <div className="grow overflow-auto py-4 rounded-lg border">
          <div className="space-y-2 px-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[55px] w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!relationships || relationships.length === 0) {
    return (
      <div className="w-full pt-18 flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Link className="mx-auto h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">No relationships found</h3>
            <p className="text-muted-foreground">This sketch doesn't have any relationships yet.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full grow flex flex-col pt-18 space-y-4 p-4 px-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Relationships</h2>
          <p className="text-muted-foreground">
            {filteredRelationships.length} of {relationships.length} relationships
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {relationships.length} total
        </Badge>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search relationships, nodes, or types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {nodeTypes.map((type) => (
              <SelectItem key={type} value={type}>
                <span className="capitalize">{type}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Virtualized List */}
      <div ref={parentRef} className="grow overflow-auto py-4 rounded-lg border">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
          className="space-y-2"
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const relationship = filteredRelationships[virtualRow.index]

            return (
              <RelationshipItem
                key={virtualRow.index}
                relationship={relationship}
                onNodeClick={onNodeClick}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
