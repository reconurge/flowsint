import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { investigationService } from '@/api/investigation-service'
import { analysisService } from '@/api/analysis-service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CaseOverviewPage } from "@/components/dashboard/investigation/case-overview-page"


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

  return (
    <CaseOverviewPage investigation={investigation} />
  )
}
