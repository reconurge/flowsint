import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { sketchService } from '@/api/sketch-service'
import { useGraphStore } from '@/stores/graph-store'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Search, ArrowRight, Users, Link, Filter, Trash2 } from 'lucide-react'
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
import { GraphNode, GraphEdge } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/use-confirm-dialog'
import { toast } from 'sonner'

const ITEM_HEIGHT = 67 // Balanced spacing between items (55px card + 12px padding)

// Separate component for relationship item to avoid hook order issues
interface RelationshipItemProps {
  relationship: RelationshipType
  style: React.CSSProperties
  onNodeClick: (node: GraphNode) => void
  isSelected: boolean
  onSelectionChange: (edge: GraphEdge, checked: boolean) => void
}

function RelationshipItem({
  relationship,
  style,
  onNodeClick,
  isSelected,
  onSelectionChange
}: RelationshipItemProps) {
  const SourceIcon = useIcon(relationship.source.nodeType, {
    nodeColor: relationship.source.nodeColor,
    nodeIcon: relationship.source.nodeIcon,
    nodeImage: relationship.source.nodeImage
  })
  const TargetIcon = useIcon(relationship.target.nodeType, {
    nodeColor: relationship.target.nodeColor,
    nodeIcon: relationship.target.nodeIcon,
    nodeImage: relationship.target.nodeImage
  })

  const handleNodeClickSource = useCallback(() => {
    onNodeClick(relationship.source)
  }, [])
  const handleNodeClickTarget = useCallback(() => {
    onNodeClick(relationship.target)
  }, [])

  const handleCheckboxChange = useCallback(
    (checked: boolean) => {
      onSelectionChange(relationship.edge, checked)
    },
    [onSelectionChange, relationship.edge]
  )

  return (
    <div style={style} className="px-3 pb-2">
      <Card className="h-[55px] p-0 rounded-md">
        <CardContent className="p-3 h-[55px] flex items-center gap-3 min-w-0">
          {/* Checkbox */}
          <div className="flex items-center shrink-0">
            <Checkbox checked={isSelected} onCheckedChange={handleCheckboxChange} />
          </div>

          {/* Source Node */}
          <div className="flex items-center gap-2 flex-1 min-w-0 max-w-[35%]">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted shrink-0">
              <SourceIcon size={16} />
            </div>
            <button
              onClick={handleNodeClickSource}
              className="font-medium text-sm hover:text-primary hover:underline cursor-pointer text-left min-w-0 flex-1"
            >
              <span className="block truncate">
                {relationship.source.nodeLabel ?? relationship.source.id}
              </span>
            </button>
            <div className="shrink-0">
              <CopyButton content={relationship.source.nodeLabel ?? relationship.source.id} />
            </div>
          </div>

          {/* Relationship Arrow */}
          <div className="flex items-center grow justify-center px-2 shrink-0 min-w-[120px] max-w-[30%]">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground w-full">
              <div className="h-px bg-muted-foreground/30 w-[8px]"></div>
              <span className="px-2 py-1 bg-muted/50 rounded-sm truncate max-w-full">
                {relationship.edge.label}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            </div>
          </div>

          {/* Target Node */}
          <div className="flex items-center gap-2 flex-1 justify-end min-w-0 max-w-[35%]">
            <div className="shrink-0">
              <CopyButton content={relationship.target.nodeLabel ?? relationship.target.id} />
            </div>
            <button
              onClick={handleNodeClickTarget}
              className="font-medium text-sm hover:text-primary hover:underline cursor-pointer text-right min-w-0 flex-1"
            >
              <span className="block truncate">
                {relationship.target.nodeLabel || relationship.target.id}
              </span>
            </button>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted shrink-0">
              <TargetIcon size={16} />
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
  const {
    data: relationships,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['graph', 'relationships_view', sketchId],
    enabled: Boolean(sketchId),
    queryFn: () => sketchService.getGraphDataById(sketchId as string, true)
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const parentRef = useRef<HTMLDivElement>(null)
  const setCurrentNodeId = useGraphStore((s) => s.setCurrentNodeId)
  const selectedEdges = useGraphStore((s) => s.selectedEdges)
  const setSelectedEdges = useGraphStore((s) => s.setSelectedEdges)
  const removeEdges = useGraphStore((s) => s.removeEdges)
  const clearSelectedEdges = useGraphStore((s) => s.clearSelectedEdges)
  const { confirm } = useConfirm()
  // const setOpenNodeEditorModal = useGraphStore(s => s.setOpenNodeEditorModal)

  const onNodeClick = useCallback(
    (node: GraphNode) => {
      setCurrentNodeId(node.id)
      // setOpenNodeEditorModal(true)
    },
    [
      setCurrentNodeId
      // setOpenNodeEditorModal
    ]
  )

  // Filter relationships based on search and type
  const filteredRelationships = useMemo(() => {
    if (!relationships) return []

    return relationships.filter((rel: RelationshipType) => {
      const matchesSearch =
        searchQuery === '' ||
        rel.source.nodeLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rel.target.nodeLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rel.edge.label?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType =
        selectedType === 'all' ||
        rel.source.nodeType === selectedType ||
        rel.target.nodeType === selectedType

      return matchesSearch && matchesType
    })
  }, [relationships, searchQuery, selectedType])

  // Get unique node types for filter
  const nodeTypes = useMemo(() => {
    if (!relationships) return []
    const types = new Set<string>()
    relationships.forEach((rel: RelationshipType) => {
      if (rel.source.nodeType) types.add(rel.source.nodeType)
      if (rel.target.nodeType) types.add(rel.target.nodeType)
    })
    return Array.from(types).sort()
  }, [relationships])

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedEdges(filteredRelationships.map((rel: RelationshipType) => rel.edge))
      } else {
        setSelectedEdges([])
      }
    },
    [setSelectedEdges, filteredRelationships]
  )

  const handleEdgeSelectionChange = useCallback(
    (edge: GraphEdge, checked: boolean) => {
      const isSelected = selectedEdges.some((e) => e.id === edge.id)
      if (checked && !isSelected) {
        setSelectedEdges([...selectedEdges, edge])
      } else if (!checked && isSelected) {
        setSelectedEdges(selectedEdges.filter((e) => e.id !== edge.id))
      }
    },
    [selectedEdges, setSelectedEdges]
  )

  const isEdgeSelected = useCallback(
    (edgeId: string) => {
      return selectedEdges.some((edge) => edge.id === edgeId)
    },
    [selectedEdges]
  )

  const isAllSelected = useMemo(() => {
    return (
      filteredRelationships.length > 0 &&
      filteredRelationships.every((rel: RelationshipType) => isEdgeSelected(rel.edge.id))
    )
  }, [filteredRelationships, isEdgeSelected])

  const isIndeterminate = useMemo(() => {
    const selectedCount = filteredRelationships.filter((rel: RelationshipType) =>
      isEdgeSelected(rel.edge.id)
    ).length
    return selectedCount > 0 && selectedCount < filteredRelationships.length
  }, [filteredRelationships, isEdgeSelected])

  const handleDeleteSelected = useCallback(async () => {
    if (selectedEdges.length === 0 || !sketchId) return

    const count = selectedEdges.length
    if (
      !(await confirm({
        title: `You are about to delete ${count} relationship${count > 1 ? 's' : ''}?`,
        message: 'The action is irreversible.'
      }))
    ) {
      return
    }

    toast.promise(
      (async () => {
        const edgeIds = selectedEdges.map((e) => e.id)
        removeEdges(edgeIds)
        clearSelectedEdges()
        await sketchService.deleteEdges(
          sketchId as string,
          JSON.stringify({ relationshipIds: edgeIds })
        )
        refetch()
      })(),
      {
        loading: `Deleting ${count} relationship${count > 1 ? 's' : ''}...`,
        success: `Relationship${count > 1 ? 's' : ''} deleted successfully.`,
        error: 'Failed to delete relationships.'
      }
    )
  }, [selectedEdges, sketchId, confirm, removeEdges, clearSelectedEdges, refetch])

  const virtualizer = useVirtualizer({
    count: filteredRelationships.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5
  })

  if (isLoading) {
    return (
      <div className="w-full grow h-full flex flex-col p-4 px-6">
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
              <SelectItem value="all">All types</SelectItem>
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
      <div className="w-full flex items-center justify-center h-full">
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
    <div className="w-full grow h-full flex flex-col p-4 px-6">
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
      <div className="flex gap-4 my-4">
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
            <SelectItem value="all">All types</SelectItem>
            {nodeTypes.map((type) => (
              <SelectItem key={type} value={type}>
                <span className="capitalize">{type}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selection Controls */}
      {filteredRelationships.length > 0 && (
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAllSelected}
              ref={(el) => {
                if (el && 'indeterminate' in el) {
                  ;(el as HTMLInputElement).indeterminate = isIndeterminate
                }
              }}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedEdges.length > 0 ? `${selectedEdges.length} selected` : 'Select all'}
            </span>
          </div>
          {selectedEdges.length > 0 && (
            <Button onClick={handleDeleteSelected} variant="destructive" size="sm" className="h-8">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete {selectedEdges.length}
            </Button>
          )}
        </div>
      )}

      {/* Virtualized List */}
      <div ref={parentRef} className="grow overflow-auto py-4 rounded border">
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
                isSelected={isEdgeSelected(relationship.edge.id)}
                onSelectionChange={handleEdgeSelectionChange}
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
