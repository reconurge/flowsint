import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { analysisService } from '@/api/analysis-service'
import type { Analysis } from '@/types'
import { useAnalysisPanelStore } from '@/stores/analysis-panel-store'
import { AnalysisEditor } from './analysis-editor'
import { useEffect, memo } from 'react'
import AnalysisSkeleton from './analysis-skeleton'

export const AnalysisPanel = memo(() => {
  const { investigationId } = useParams({ strict: false }) as { investigationId: string }
  const currentAnalysisId = useAnalysisPanelStore((s) => s.currentAnalysisId)
  const setCurrentAnalysisId = useAnalysisPanelStore((s) => s.setCurrentAnalysisId)

  // Fetch all analyses for this investigation
  const {
    data: analyses,
    isLoading: isLoadingAnalyses,
    isError,
    refetch
  } = useQuery<Analysis[]>({
    queryKey: ['analyses', investigationId],
    queryFn: () => analysisService.getByInvestigationId(investigationId),
    enabled: !!investigationId
  })

  // Find the current analysis
  const currentAnalysis = Array.isArray(analyses)
    ? analyses?.find((a) => a.id === currentAnalysisId) || (analyses && analyses[0])
    : null

  // Set currentAnalysisId to first if not set
  useEffect(() => {
    if (
      analyses &&
      analyses.length > 0 &&
      (!currentAnalysisId || !analyses.some((a) => a.id === currentAnalysisId))
    ) {
      setCurrentAnalysisId(analyses[0].id)
    }
    if (analyses && analyses.length === 0) {
      setCurrentAnalysisId(null)
    }
  }, [analyses, currentAnalysisId, setCurrentAnalysisId])

  const handleAnalysisUpdate = () => {
    refetch()
  }

  const handleAnalysisDelete = () => {
    refetch()
    // Set to another analysis or null
    if (analyses && analyses.length > 1) {
      const next = analyses.find((a) => a.id !== currentAnalysisId)
      setCurrentAnalysisId(next?.id || null)
    } else {
      setCurrentAnalysisId(null)
    }
  }

  const handleAnalysisCreate = (investigationId: string) => {
    refetch()
    setCurrentAnalysisId(investigationId)
  }

  if (isLoadingAnalyses) {
    return <AnalysisSkeleton />
  }

  if (isError) {
    return <div className="text-sm text-destructive">Error loading analyses.</div>
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Analysis Editor with all functionality */}
      <AnalysisEditor
        analysis={currentAnalysis}
        investigationId={investigationId}
        onAnalysisUpdate={handleAnalysisUpdate}
        onAnalysisDelete={handleAnalysisDelete}
        onAnalysisCreate={handleAnalysisCreate}
        onAnalysisSelect={setCurrentAnalysisId}
        showHeader={true}
        showAnalysisSelector={true}
        showNavigation={true}
        isLoading={isLoadingAnalyses}
        analyses={analyses || []}
        currentAnalysisId={currentAnalysisId}
      />
    </div>
  )
})

export default memo(AnalysisPanel)
