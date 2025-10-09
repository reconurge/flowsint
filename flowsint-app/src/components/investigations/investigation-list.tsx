import { investigationService } from '@/api/investigation-service'
import type { Investigation } from '@/types/investigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Sketch } from '@/types/sketch'
import NewInvestigation from './new-investigation'
import { Button } from '../ui/button'
import {
  MoreVertical,
  PlusIcon,
  Trash2,
  Waypoints,
  ChevronRight,
  ChevronDown,
  Search
} from 'lucide-react'
import { Input } from '../ui/input'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { SkeletonList } from '../shared/skeleton-list'
import { useConfirm } from '@/components/use-confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { toast } from 'sonner'
import { sketchService } from '@/api/sketch-service'
import { useState, useMemo } from 'react'
import { queryKeys } from '@/api/query-keys'
import { useMutation } from '@tanstack/react-query'
import ErrorState from '../shared/error-state'

// Tree node component for investigations and sketches
const TreeNode = ({
  item,
  level = 0,
  isExpanded,
  onToggle,
  isActive,
  onDelete,
  children,
  isClickable = true
}: {
  item: { id: string; name: string; type: 'investigation' | 'sketch' }
  level?: number
  isExpanded?: boolean
  onToggle?: () => void
  isActive?: boolean
  onDelete?: (e: React.MouseEvent) => void
  children?: React.ReactNode
  isClickable?: boolean
}) => {
  const isInvestigation = item.type === 'investigation'
  const hasChildren = isInvestigation && children
  const canExpand = isInvestigation && hasChildren

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggle?.()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(e)
  }

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div className="w-full">
      <div
        className={cn(
          'flex items-center group gap-2 px-3 py-2 hover:bg-muted/50 transition-colors',
          isActive && 'bg-muted',
          level > 0 && 'pl-4',
          !isClickable && 'cursor-default'
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {/* Expand/collapse button for investigations */}
        {canExpand && (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={handleToggle}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* Icon */}
        {isInvestigation ? (
          <Search className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Waypoints className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Name */}
        <span className="flex-1 text-sm truncate font-medium">{item.name}</span>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 group-hover:opacity-100 opacity-0 transition-all duration-100"
                onClick={handleDropdownClick}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {isInvestigation ? 'Investigation' : 'Sketch'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {canExpand && isExpanded && <div className="w-full">{children}</div>}
    </div>
  )
}

export const SketchListItem = ({
  sketch,
  investigationId,
  refetch
}: {
  sketch: Sketch
  investigationId: string
  refetch: () => void
}) => {
  const { confirm } = useConfirm()
  const queryClient = useQueryClient()

  // Delete sketch mutation
  const deleteSketchMutation = useMutation({
    mutationFn: sketchService.delete,
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.investigations.list
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.investigations.detail(investigationId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.investigations.sketches(investigationId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.sketches.list
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.sketches.detail(sketch.id)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.sketches.graph(investigationId, sketch.id)
      })
      // Also invalidate dashboard queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.investigations.dashboard
      })
      // Ensure parent lists refresh
      try {
        refetch()
      } catch {}
    },
    onError: (error) => {
      console.error('Error deleting sketch:', error)
    }
  })

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmed = await confirm({
      title: 'Delete Sketch',
      message: `Are you sure you want to delete "${sketch.title}"? This action cannot be undone.`
    })

    if (confirmed) {
      toast.promise(deleteSketchMutation.mutateAsync(sketch.id), {
        loading: 'Deleting sketch...',
        success: () => `Sketch "${sketch.title}" has been deleted`,
        error: 'Failed to delete sketch'
      })
    }
  }

  return (
    <Link
      to="/dashboard/investigations/$investigationId/$type/$id"
      params={{
        investigationId: investigationId,
        type: 'graph',
        id: sketch.id
      }}
      id={sketch.id}
    >
      {({ isActive }) => (
        <TreeNode
          item={{ id: sketch.id, name: sketch.title, type: 'sketch' }}
          level={1}
          isActive={isActive}
          onDelete={handleDelete}
          isClickable={false}
        />
      )}
    </Link>
  )
}

const InvestigationList = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.investigations.list,
    queryFn: investigationService.get
  })
  const { confirm } = useConfirm()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const filteredInvestigations = useMemo(() => {
    if (!data) return []
    if (!searchQuery.trim()) return data

    const query = searchQuery.toLowerCase().trim()
    return data.filter((investigation: Investigation) => {
      const matchesInvestigation = investigation.name.toLowerCase().includes(query)
      const matchesSketches = investigation.sketches?.some((sketch) =>
        sketch.title.toLowerCase().includes(query)
      )
      return matchesInvestigation || matchesSketches
    })
  }, [data, searchQuery])

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const handleDeleteInvestigation = async (investigation: Investigation, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmed = await confirm({
      title: 'Delete Investigation',
      message: `Are you sure you want to delete "${investigation.name}"? This will also delete all sketches within it. This action cannot be undone.`
    })

    if (confirmed) {
      const deletePromise = () =>
        investigationService.delete(investigation.id).then(() => {
          // Invalidate the investigations list
          queryClient.invalidateQueries({
            queryKey: queryKeys.investigations.list
          })

          // Also remove related data from cache
          queryClient.removeQueries({
            queryKey: queryKeys.investigations.detail(investigation.id)
          })
          queryClient.removeQueries({
            queryKey: queryKeys.investigations.sketches(investigation.id)
          })
          queryClient.removeQueries({
            queryKey: queryKeys.investigations.analyses(investigation.id)
          })
          queryClient.removeQueries({
            queryKey: queryKeys.investigations.flows(investigation.id)
          })
        })

      toast.promise(deletePromise, {
        loading: 'Deleting investigation...',
        success: () => `Investigation "${investigation.name}" has been deleted`,
        error: 'Failed to delete investigation'
      })
    }
  }

  if (error)
    return (
      <ErrorState
        title="Couldn't load investigations"
        description="Something went wrong while fetching data. Please try again."
        error={error}
        onRetry={() => refetch()}
      />
    )
  return (
    <div className="w-full h-full bg-card flex flex-col overflow-hidden">
      <div className="p-2 flex items-center gap-2 border-b">
        <NewInvestigation noDropDown>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </NewInvestigation>
        <Input
          type="search"
          className="h-7"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="p-2">
          <SkeletonList rowCount={7} />
        </div>
      ) : filteredInvestigations.length > 0 ? (
        <div className="overflow-auto">
          {filteredInvestigations.map((investigation: Investigation) => {
            const isExpanded = expandedNodes.has(investigation.id)
            const hasSketches = investigation.sketches && investigation.sketches.length > 0

            return (
              <div key={investigation.id} className="w-full">
                <Link
                  to="/dashboard/investigations/$investigationId"
                  params={{
                    investigationId: investigation.id
                  }}
                >
                  {({ isActive }) => (
                    <TreeNode
                      item={{
                        id: investigation.id,
                        name: investigation.name,
                        type: 'investigation'
                      }}
                      isExpanded={isExpanded}
                      onToggle={() => toggleNode(investigation.id)}
                      isActive={isActive}
                      onDelete={(e) => handleDeleteInvestigation(investigation, e)}
                      isClickable={false}
                    >
                      {hasSketches ? (
                        investigation.sketches!.map((sketch: Sketch) => (
                          <SketchListItem
                            refetch={refetch}
                            key={sketch.id}
                            sketch={sketch}
                            investigationId={investigation.id}
                          />
                        ))
                      ) : (
                        <div className="ml-8 px-3 py-2 text-sm text-muted-foreground">
                          No sketches
                        </div>
                      )}
                    </TreeNode>
                  )}
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex-1 p-4">
          <div className="h-full w-full rounded-lg border border-dashed bg-muted/30 flex flex-col items-center justify-center text-center gap-3 p-6">
            <div className="text-sm font-medium">No investigations yet</div>
            <div className="text-xs text-muted-foreground max-w-xs">
              Create an investigation to organize your graphs and notes by case, incident, or
              research topic.
            </div>
            <NewInvestigation noDropDown>
              <Button size="sm">
                <PlusIcon className="w-4 h-4 mr-2" />
                Create investigation
              </Button>
            </NewInvestigation>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvestigationList
