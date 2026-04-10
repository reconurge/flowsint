import { createFileRoute, useLoaderData, useNavigate } from '@tanstack/react-router'
import { analysisService } from '@/api/analysis-service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CaseOverviewPage } from "@/components/dashboard/investigation/case-overview-page"

export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId/')({
  component: InvestigationPage,
})

function InvestigationPage() {
  const { investigation } = useLoaderData({
    from: '/_auth/dashboard/investigations/$investigationId'
  })
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
