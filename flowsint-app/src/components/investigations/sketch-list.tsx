import { investigationService } from '@/api/investigation-service'
import { useQuery } from '@tanstack/react-query'
import type { Sketch } from '@/types/sketch'
import { Button } from '../ui/button'
import { FolderOpen, PlusIcon, Waypoints } from 'lucide-react'
import { Input } from '../ui/input'
import { Link, useParams } from '@tanstack/react-router'
import { SkeletonList } from '../shared/skeleton-list'
import NewSketch from '../sketches/new-sketch'
import { useState, useMemo } from 'react'
import { queryKeys } from '@/api/query-keys'
import ErrorState from '../shared/error-state'
import { cn } from '@/lib/utils'

const SketchList = () => {
  const { investigationId } = useParams({ strict: false })
  const {
    data: investigation,
    isLoading,
    refetch,
    error
  } = useQuery({
    queryKey: queryKeys.investigations.detail(investigationId as string),
    queryFn: () => investigationService.getById(investigationId as string)
  })
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSketches = useMemo(() => {
    if (!investigation?.sketches) return []
    if (!searchQuery.trim()) return investigation.sketches

    const query = searchQuery.toLowerCase().trim()
    return investigation.sketches.filter((sketch: Sketch) => sketch.title.toLowerCase().includes(query))
  }, [investigation?.sketches, searchQuery])

  if (error)
    return (
      <ErrorState
        title="Couldn't load sketches"
        description="Something went wrong while fetching data. Please try again."
        error={error}
        onRetry={() => refetch()}
      />
    )
  return (
    <div className="w-full h-full bg-card flex flex-col overflow-hidden">
      <div className="p-2 flex items-center gap-2 border-b shrink-0">
        <NewSketch>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </NewSketch>
        <Input
          type="search"
          className="!border border-border h-7"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-2">
            <SkeletonList rowCount={7} />
          </div>
        ) : filteredSketches.length > 0 ? (
          <ul className="p-2">
            {filteredSketches.map((sketch: Sketch) => (
              <Link
                to="/dashboard/investigations/$investigationId/$type/$id"
                params={{
                  investigationId: sketch.investigation_id,
                  type: "graph",
                  id: sketch.id
                }}
              >
                <button
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left group",
                    "text-muted-foreground hover:bg-muted hover:text-sidebar-foreground"
                  )}
                >
                  <FolderOpen className="w-4 h-4 shrink-0 opacity-60" />
                  <span className="truncate flex-1">{sketch.title}</span>
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      sketch.status === "active" && "bg-success",
                      sketch.status === "closed" && "bg-muted-foreground/50",
                      sketch.status === "on-hold" && "bg-warning",
                    )}
                  />
                </button>
              </Link>
            ))}
          </ul>
        ) : (
          <div className="p-6 flex flex-col items-center text-center gap-3 text-muted-foreground">
            <Waypoints className="h-10 w-10 text-yellow-500" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {searchQuery ? 'No matching sketches' : 'No sketches yet'}
              </h3>
              <p className="text-xs opacity-70 max-w-xs">
                {searchQuery
                  ? "Try adjusting your search query to find what you're looking for."
                  : "This investigation doesn't contain any sketch. Sketches let you organize and visualize your data as graphs."}
              </p>
            </div>
            <NewSketch>
              <Button size="sm" variant="outline">
                <PlusIcon className="w-4 h-4 mr-2" />
                Create your first sketch
              </Button>
            </NewSketch>
          </div>
        )}
      </div>
    </div>
  )
}

export default SketchList
