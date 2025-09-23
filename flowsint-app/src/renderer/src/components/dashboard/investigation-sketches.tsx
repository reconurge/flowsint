import { useQuery } from '@tanstack/react-query'
import { investigationService } from '@/api/investigation-service'
import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Plus, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import NewSketch from '@/components/graphs/new-sketch'
import ErrorState from '@/components/shared/error-state'

interface InvestigationSketchesProps {
  investigationId: string
  title: string
}

function SketchCard({ sketch, investigationId }: { sketch: any; investigationId: string }) {
  return (
    <Link
      to="/dashboard/investigations/$investigationId/$type/$id"
      params={{
        investigationId: investigationId,
        type: 'graph',
        id: sketch.id
      }}
      className="block"
    >
      <Card className="hover:shadow-lg py-4 transition-all duration-200 cursor-pointer group border-2 hover:border-primary/20">
        <CardContent className="h-full flex flex-col">
          {/* Header with title and type */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {sketch.title}
                </h3>
                <p className="text-xs text-muted-foreground">Graph sketch</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">
              Graph
            </Badge>
          </div>

          {/* Description */}
          <div className="flex-1 mb-3 min-w-0">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {sketch.description || 'No description available'}
            </p>
          </div>

          {/* Footer with timestamp */}
          <div className="mt-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                Updated {formatDistanceToNow(new Date(sketch.last_updated_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function InvestigationSketchesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="w-full">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="flex-1 mb-3">
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="mt-auto">
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function InvestigationSketches({ investigationId, title }: InvestigationSketchesProps) {
  const {
    data: investigation,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['investigation', 'sketches', investigationId],
    queryFn: () => investigationService.getById(investigationId),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })

  if (isLoading) {
    return <InvestigationSketchesSkeleton />
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load sketches"
        description="Something went wrong while fetching data. Please try again."
        error={error}
        onRetry={() => refetch()}
      />
    )
  }

  const sketches = investigation?.sketches || []

  if (sketches.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Sketches</h2>
          </div>
          <NewSketch>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Sketch
            </Button>
          </NewSketch>
        </div>
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No sketches yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first sketch to start visualizing your investigation data.
          </p>
          <NewSketch>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Sketch
            </Button>
          </NewSketch>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-xl font-semibold">{title}</h2>
          <span className="text-sm text-muted-foreground">{sketches.length} sketches</span>
        </div>
        <div className="flex items-center gap-2">
          <NewSketch>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Sketch
            </Button>
          </NewSketch>
        </div>
      </div>

      <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
        {sketches.slice(0, 8).map((sketch: any) => (
          <SketchCard key={sketch.id} sketch={sketch} investigationId={investigationId} />
        ))}
      </div>
    </div>
  )
}
