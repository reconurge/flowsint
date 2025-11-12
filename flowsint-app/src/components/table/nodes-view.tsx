import { useGraphStore } from '@/stores/graph-store'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState, useMemo, useCallback, memo } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Users, Link, Filter, Calendar } from 'lucide-react'
import { useIcon } from '@/hooks/use-icon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { CopyButton } from '../copy'
import { GraphNode } from '@/types'
import { formatDistanceToNow } from 'date-fns'

export type RelationshipType = {
  source: GraphNode
  target: GraphNode
  edge: { label: string }
}

const ITEM_HEIGHT = 56 // Row height used by virtualizer

// Separate component for node item to avoid hook order issues
interface NodeItemProps {
  node: GraphNode
  onNodeClick: (node: GraphNode) => void
  isSelected: boolean
  onSelectionChange: (node: GraphNode, checked: boolean) => void
}

const NodeItem = memo(function NodeItem({
  node,
  onNodeClick,
  isSelected,
  onSelectionChange
}: NodeItemProps) {
  const SourceIcon = useIcon(node.data?.type, node.data?.src)

  const handleNodeClick = useCallback(() => {
    onNodeClick(node)
  }, [onNodeClick, node])

  const handleCheckboxChange = useCallback(
    (checked: boolean) => {
      onSelectionChange(node, checked)
    },
    [onSelectionChange, node]
  )

  const formatCreatedAt = useCallback((dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }, [])

  return (
    <div className="px-4">
      <div
        className="grid items-center h-[56px] gap-3 text-sm border-b last:border-b-0"
        style={{
          gridTemplateColumns: '24px 32px 1fr 140px 160px 32px'
        }}
      >
        {/* Checkbox */}
        <div className="flex items-center">
          <Checkbox checked={isSelected} onCheckedChange={handleCheckboxChange} />
        </div>

        {/* Icon */}
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-muted">
            <SourceIcon className="h-4 w-4" />
          </div>
        </div>

        {/* Label */}
        <div className="min-w-0 flex justify-start grow">
          <button
            onClick={handleNodeClick}
            className="font-medium hover:text-primary hover:underline cursor-pointer truncate p-0"
          >
            <span className="block truncate">{node.data?.label ?? node.id}</span>
          </button>
        </div>

        {/* Type */}
        <div>
          <Badge variant="outline" className="text-xs">
            {node.data?.type || 'Unknown'}
          </Badge>
        </div>

        {/* Created At */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
          <Calendar className="h-3 w-3" />
          <span className="truncate">
            {node.data?.created_at ? formatCreatedAt(node.data.created_at) : 'Unknown'}
          </span>
        </div>

        {/* Copy Button */}
        <div className="flex justify-end">
          <CopyButton content={node.data?.label ?? node.id} />
        </div>
      </div>
    </div>
  )
})

type NodesTableProps = {
  nodes: GraphNode[]
}
export default function NodesTable({ nodes }: NodesTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const parentRef = useRef<HTMLDivElement>(null)
  const setCurrentNode = useGraphStore((s) => s.setCurrentNode)
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const setSelectedNodes = useGraphStore((s) => s.setSelectedNodes)
  const toggleNodeSelection = useGraphStore((s) => s.toggleNodeSelection)

  const onNodeClick = useCallback(
    (node: GraphNode) => {
      setCurrentNode(node)
    },
    [setCurrentNode]
  )

  // Filter nodes based on search and type
  const filteredNodes = useMemo(() => {
    if (!nodes) return []

    return nodes.filter((node: GraphNode) => {
      const lower = searchQuery.toLowerCase()
      const label = node.data?.label?.toLowerCase() ?? ''
      const type = node.data?.type?.toLowerCase() ?? ''
      const matchesSearch = lower === '' || label.includes(lower) || type.includes(lower)

      const matchesType = selectedType === 'all' || node.data?.type === selectedType

      return matchesSearch && matchesType
    })
  }, [nodes, searchQuery, selectedType])

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedNodes(filteredNodes)
      } else {
        setSelectedNodes([])
      }
    },
    [setSelectedNodes, filteredNodes]
  )

  const handleNodeSelectionChange = useCallback(
    (node: GraphNode, checked: boolean) => {
      toggleNodeSelection(node, checked)
    },
    [toggleNodeSelection]
  )

  const isNodeSelected = useCallback(
    (nodeId: string) => {
      return selectedNodes.some((node) => node.id === nodeId)
    },
    [selectedNodes]
  )

  const isAllSelected = useMemo(() => {
    return filteredNodes.length > 0 && filteredNodes.every((node) => isNodeSelected(node.id))
  }, [filteredNodes, isNodeSelected])

  const isIndeterminate = useMemo(() => {
    const selectedCount = filteredNodes.filter((node) => isNodeSelected(node.id)).length
    return selectedCount > 0 && selectedCount < filteredNodes.length
  }, [filteredNodes, isNodeSelected])

  // Get unique node types for filter
  const nodeTypes = useMemo(() => {
    if (!nodes) return []
    const types = new Set<string>()
    nodes.forEach((node: GraphNode) => {
      if (node.data?.type) types.add(node.data.type)
    })
    return Array.from(types).sort()
  }, [nodes])

  const virtualizer = useVirtualizer({
    count: filteredNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5
  })

  if (!nodes || nodes.length === 0) {
    return (
      <div className="w-full pt-18 flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Link className="mx-auto h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">No nodes found</h3>
            <p className="text-muted-foreground">This sketch doesn't have any nodes yet.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full grow flex flex-col pt-18 p-4 px-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Entities</h2>
          <p className="text-muted-foreground">
            {filteredNodes.length} of {nodes.length} nodes
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {nodes.length} total
        </Badge>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 my-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes, nodes, or types..."
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
      {/* Table Header */}
      <div
        className="grid items-center h-[44px] px-4 bg-muted/50 p-2 rounded-t-lg border text-sm font-medium text-muted-foreground"
        style={{ gridTemplateColumns: '24px 32px 1fr 140px 160px 32px' }}
      >
        <div className="flex items-center">
          <Checkbox
            checked={isAllSelected}
            ref={(el) => {
              if (el && 'indeterminate' in el) {
                ;(el as HTMLInputElement).indeterminate = isIndeterminate
              }
            }}
            onCheckedChange={handleSelectAll}
          />
        </div>
        <div></div> {/* Icon */}
        <div className="text-left">Label</div>
        <div>Type</div>
        <div>Created</div>
        <div></div> {/* Actions */}
      </div>

      {/* Virtualized List */}
      <div ref={parentRef} className="grow overflow-auto rounded-b-lg border border-t-0">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
          className=""
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const node = filteredNodes[virtualRow.index]

            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
                className="hover:bg-muted/40"
              >
                <NodeItem
                  node={node}
                  onNodeClick={onNodeClick}
                  isSelected={isNodeSelected(node.id)}
                  onSelectionChange={handleNodeSelectionChange}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
