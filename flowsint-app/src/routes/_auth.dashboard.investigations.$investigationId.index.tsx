import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { investigationService } from '@/api/investigation-service'
import { analysisService } from '@/api/analysis-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Calendar,
  User,
  FileText,
  BarChart3,
  Clock,
  ChevronDown,
  Waypoints
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import NewSketch from '@/components/graphs/new-sketch'

function InvestigationSkeleton() {
  return (
    <div className="h-full w-full bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="w-64 h-8 bg-muted rounded animate-pulse" />
          <div className="w-96 h-4 bg-muted rounded animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="w-20 h-6 bg-muted rounded animate-pulse" />
            <div className="w-24 h-6 bg-muted rounded animate-pulse" />
            <div className="w-32 h-6 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="w-48 h-6 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-32 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId/')({
  loader: async ({ params: { investigationId } }) => {
    return {
      investigation: await investigationService.getById(investigationId)
    }
  },
  component: InvestigationPage,
  pendingComponent: InvestigationSkeleton
})

function InvestigationPage() {
  const { investigation } = Route.useLoaderData()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createAnalysisMutation = useMutation({
    mutationFn: async () => {
      const newAnalysis = {
        title: 'Untitled Analysis',
        investigation_id: investigation.id,
        content: {}
      }
      return analysisService.create(JSON.stringify(newAnalysis))
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['analyses', 'investigation', investigation.id] })
      toast.success('New analysis created')
      // Navigate to the New analysis page
      navigate({
        to: '/dashboard/investigations/$investigationId/$type/$id',
        params: {
          investigationId: investigation.id,
          type: 'analysis',
          id: data.id
        }
      })
    },
    onError: (error) => {
      toast.error(
        'Failed to create analysis: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  const sketchCount = investigation.sketches?.length || 0
  const analysisCount = investigation.analyses?.length || 0
  const lastUpdated = formatDistanceToNow(new Date(investigation.last_updated_at), {
    addSuffix: true
  })

  return (
    <div className="h-full w-full bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{investigation.name}</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                {investigation.description || 'No description provided'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div>
                    <Button className="gap-2" disabled={createAnalysisMutation.isPending}>
                      New
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <NewSketch>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      New Sketch
                    </DropdownMenuItem>
                  </NewSketch>
                  <DropdownMenuItem
                    onClick={() => createAnalysisMutation.mutate()}
                    disabled={createAnalysisMutation.isPending}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    New analysis
                    {createAnalysisMutation.isPending && (
                      <span className="ml-2 text-xs text-muted-foreground">Creating...</span>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Created{' '}
                {formatDistanceToNow(new Date(investigation.created_at), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Updated {lastUpdated}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>
                {investigation.owner
                  ? `${investigation.owner.first_name || ''} ${investigation.owner.last_name || ''}`.trim() ||
                    'Unknown'
                  : 'Unknown'}
              </span>
            </div>
            <Badge variant={investigation.status === 'active' ? 'default' : 'secondary'}>
              {investigation.status}
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sketches</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sketchCount}</div>
              <p className="text-xs text-muted-foreground">Visual data representations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysisCount}</div>
              <p className="text-xs text-muted-foreground">Documented findings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lastUpdated}</div>
              <p className="text-xs text-muted-foreground">Since last update</p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Sketches Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Sketches</h2>
                <Badge variant="outline" className="ml-2">
                  {sketchCount}
                </Badge>
              </div>
            </div>

            {sketchCount === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold mb-2">No sketches yet</h3>
                  <p className="text-muted-foreground mb-4 text-center max-w-md">
                    Create your first sketch to start visualizing your investigation data and
                    building relationships between entities.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {investigation.sketches?.slice(0, 8).map((sketch: any) => (
                  <Card
                    onClick={() =>
                      navigate({
                        to: '/dashboard/investigations/$investigationId/$type/$id',
                        params: {
                          investigationId: investigation.id,
                          type: 'graph',
                          id: sketch.id
                        }
                      })
                    }
                    className="hover:shadow-lg py-4 transition-all duration-200 cursor-pointer group border hover:border-primary/20"
                  >
                    <CardContent className="h-full flex flex-col">
                      {/* Header with title and count */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Waypoints className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                              {sketch.title}
                            </h3>
                          </div>
                        </div>
                      </div>
                      {/* Footer with timestamp */}
                      <div className="mt-auto">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            Updated{' '}
                            {formatDistanceToNow(new Date(sketch.last_updated_at), {
                              addSuffix: true
                            })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Analyses Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Analyses</h2>
                <Badge variant="outline" className="ml-2">
                  {analysisCount}
                </Badge>
              </div>
            </div>

            {analysisCount === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold mb-2">No analyses yet</h3>
                  <p className="text-muted-foreground mb-4 text-center max-w-md">
                    Create your first analysis to start documenting your findings, observations, and
                    investigative notes.
                  </p>
                  <Button
                    onClick={() => createAnalysisMutation.mutate()}
                    disabled={createAnalysisMutation.isPending}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create analysis
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {investigation.analyses?.slice(0, 8).map((analysis: any) => (
                  <Card
                    key={analysis.id}
                    className="group py-2 relative overflow-hidden cursor-pointer hover:shadow-xl border border-border hover:border-secondary"
                    onClick={() =>
                      navigate({
                        to: '/dashboard/investigations/$investigationId/$type/$id',
                        params: {
                          investigationId: investigation.id,
                          type: 'analysis',
                          id: analysis.id
                        }
                      })
                    }
                  >
                    <CardContent className="p-6 relative">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                          {analysis.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {analysis.description || 'No description provided'}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-emerald-200/50 dark:border-emerald-800/30">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(analysis.last_updated_at), {
                              addSuffix: true
                            })}
                          </span>
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
