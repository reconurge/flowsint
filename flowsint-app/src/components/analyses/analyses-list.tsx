import { useQuery } from '@tanstack/react-query'
import { Button } from '../ui/button'
import { PlusIcon, FileText } from 'lucide-react'
import { Input } from '../ui/input'
import { useParams, Link, useNavigate } from '@tanstack/react-router'
import { SkeletonList } from '../shared/skeleton-list'
import { useState, useMemo } from 'react'
import { Analysis } from '@/types'
import { analysisService } from '@/api/analysis-service'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { queryKeys } from '@/api/query-keys'
import ErrorState from '../shared/error-state'

const AnalysisItem = ({ analysis, active }: { analysis: Analysis; active: boolean }) => {
  return (
    <Link
      to="/dashboard/investigations/$investigationId/$type/$id"
      params={{
        investigationId: analysis.investigation_id || '',
        type: 'analysis',
        id: analysis.id
      }}
      className={cn(
        'p-2 flex items-center gap-2 border-b shrink-0 hover:bg-muted/50 transition-colors',
        active && 'bg-primary/10'
      )}
    >
      <div className="flex items-center gap-2 w-full">
        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{analysis.title}</p>
          <p className="text-xs text-muted-foreground">
            {analysis.last_updated_at
              ? formatDistanceToNow(new Date(analysis.last_updated_at), { addSuffix: true })
              : ''}
          </p>
        </div>
      </div>
    </Link>
  )
}

const AnalysisList = () => {
  const { investigationId, id, type } = useParams({ strict: false })
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Fetch all analyses for this investigation
  const {
    data: analyses,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: queryKeys.analyses.byInvestigation(investigationId || ''),
    queryFn: () => analysisService.getByInvestigationId(investigationId || ''),
    enabled: !!investigationId
  })
  

  const [searchQuery, setSearchQuery] = useState('')

  const filteredAnalyses = useMemo(() => {
    if (!analyses) return []
    if (!searchQuery.trim()) return analyses

    const query = searchQuery.toLowerCase().trim()
    return analyses.filter((analysis: Analysis) => analysis.title.toLowerCase().includes(query))
  }, [analyses, searchQuery])

  const createMutation = useMutation({
    mutationFn: async () => {
      const newAnalysis: Partial<Analysis> = {
        title: 'Untitled Analysis',
        investigation_id: investigationId,
        content: {}
      }
      return analysisService.create(JSON.stringify(newAnalysis))
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.analyses.byInvestigation(investigationId || '')
      })
      toast.success('Analysis created successfully')
      investigationId &&
        navigate({
          to: '/dashboard/investigations/$investigationId/$type/$id',
          params: { investigationId, type: 'analysis', id: data.id }
        })
    },
    onError: (error) => {
      toast.error(
        'Failed to create analysis: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  if (error)
    return (
      <ErrorState
        title="Couldn't load analyses"
        description="Something went wrong while fetching data. Please try again."
        error={error}
        onRetry={() => refetch()}
      />
    )
  return (
    <div className="w-full h-full bg-card flex flex-col overflow-hidden">
      <div className="p-2 flex items-center h-11 gap-2 border-b shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          title="Create New analysis"
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
        <Input
          type="search"
          className="!border border-border h-7"
          placeholder="Search analyses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-2">
            <SkeletonList rowCount={7} />
          </div>
        ) : filteredAnalyses.length > 0 ? (
          <ul>
            {filteredAnalyses.map((analysis: Analysis) => (
              <AnalysisItem
                active={type === 'analysis' && id === analysis.id}
                key={analysis.id}
                analysis={analysis}
              />
            ))}
          </ul>
        ) : (
          <div className="p-6 flex flex-col items-center text-center gap-3 text-muted-foreground">
            <FileText className="h-10 w-10 text-yellow-500" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {searchQuery ? 'No matching analyses' : 'No analyses yet'}
              </h3>
              <p className="text-xs opacity-70 max-w-xs">
                {searchQuery
                  ? "Try adjusting your search query to find what you're looking for."
                  : "This investigation doesn't contain any analysis. Analyses let you organize and document your findings."}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create your first analysis
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalysisList
