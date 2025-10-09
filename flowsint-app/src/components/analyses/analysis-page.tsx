import { useParams } from '@tanstack/react-router'
import type { Analysis } from '@/types'
import { AnalysisEditor } from './analysis-editor'
import AnalysisSkeleton from './analysis-skeleton'

export const AnalysisPage = ({
  analysis,
  isLoading,
  isError,
  refetch
}: {
  analysis: Analysis
  isLoading: boolean
  isError: boolean
  refetch: () => void
}) => {
  const { investigationId } = useParams({ strict: false }) as {
    investigationId: string
    id: string
  }

  if (isLoading) {
    return (
      <div className="w-full flex gap-3 max-w-4xl mx-auto flex-col items-start justify-start h-full overflow-hidden p-20">
        <AnalysisSkeleton />
      </div>
    )
  }

  if (isError) {
    return <div className="text-sm text-destructive">Error loading analysis.</div>
  }

  const handleAnalysisUpdate = () => {
    refetch()
  }

  const handleAnalysisDelete = () => {
    // Navigate back to investigation page or to another analysis
    window.history.back()
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Analysis Editor */}
      <AnalysisEditor
        showToolbar={true}
        analysis={analysis || null}
        investigationId={investigationId}
        onAnalysisUpdate={handleAnalysisUpdate}
        onAnalysisDelete={handleAnalysisDelete}
        showHeader={true}
        showNavigation={true}
        isLoading={isLoading}
      />
    </div>
  )
}
