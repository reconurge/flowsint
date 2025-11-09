import { useQuery } from '@tanstack/react-query'
import { analysisService } from '@/api/analysis-service'
import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Plus, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AnalysisCardProps {
  analysis: any
}

function AnalysisCard({ analysis }: AnalysisCardProps) {
  return (
    <Link
      to="/dashboard/investigations/$investigationId/$type/$id"
      params={{
        investigationId: analysis.investigation_id || '',
        type: 'analysis',
        id: analysis.id
      }}
      className="block"
    >
      <Card className="hover:shadow-lg py-4 transition-all duration-200 cursor-pointer group border-2 hover:border-primary/20">
        <CardContent className="h-full flex flex-col">
          {/* Header with title and type */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  {analysis.title}
                </h3>
                <p className="text-xs text-muted-foreground">Analysis document</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">
              Doc
            </Badge>
          </div>

          {/* Description */}
          <div className="flex-1 mb-3 min-w-0">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {analysis.description || 'No description available'}
            </p>
          </div>

          {/* Footer with timestamp */}
          <div className="mt-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                Updated{' '}
                {formatDistanceToNow(new Date(analysis.last_updated_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function AnalysisCardsSkeleton() {
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

export function AnalysisCards() {
  const { data: analyses, isLoading } = useQuery({
    queryKey: ['analyses', 'dashboard'],
    queryFn: analysisService.get
  })

  if (isLoading) {
    return <AnalysisCardsSkeleton />
  }

  if (!analyses || analyses.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Recent Analyses</h2>
          </div>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New analysis
          </Button>
        </div>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No analyses yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first analysis to start documenting your findings.
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Analysis
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Recent Analyses</h2>
          <span className="text-sm text-muted-foreground">{analyses.length} analyses</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New analysis
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
        {analyses.slice(0, 8).map((analysis: any) => (
          <AnalysisCard key={analysis.id} analysis={analysis} />
        ))}
      </div>
    </div>
  )
}
