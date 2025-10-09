import { createFileRoute, Link, useLoaderData } from '@tanstack/react-router'
import GraphPanel from '@/components/graphs'
import { sketchService } from '@/api/sketch-service'
import { useQuery } from '@tanstack/react-query'
import Loader from '@/components/loader'
import { analysisService } from '@/api/analysis-service'
import { AnalysisPage } from '@/components/analyses/analysis-page'
import { useGraphControls } from '@/stores/graph-controls-store'
import { useGraphStore } from '@/stores/graph-store'
import { useEffect } from 'react'

const services = {
  graph: sketchService.getGraphDataById,
  analysis: analysisService.getById
}

const GraphPageContent = () => {
  const setActions = useGraphControls((s) => s.setActions)
  const reset = useGraphStore((s) => s.reset)
  const {
    params: { type, id, investigationId },
    sketch
  } = useLoaderData({
    from: '/_auth/dashboard/investigations/$investigationId/$type/$id'
  })

  const {
    data: data,
    isLoading,
    isRefetching,
    isError,
    refetch
  } = useQuery({
    queryKey: ['investigations', investigationId, type, id, 'data'],
    queryFn: () => services[type](id),
    enabled: ['graph', 'analysis'].includes(type),
    // refetchInterval: 5000,
    refetchOnWindowFocus: false,
    initialData: sketch
  })

  // Reset graph store when sketchId changes or is null
  useEffect(() => {
    reset()
  }, [id, reset])

  useEffect(() => {
    setActions({ refetchGraph: refetch })
  }, [refetch, setActions, id])

  if (type === 'graph') {
    return <GraphPanel isLoading={isLoading} isRefetching={isRefetching} graphData={data} />
  }

  if (type === 'analysis') {
    return (
      <AnalysisPage analysis={data} isLoading={isLoading} isError={isError} refetch={refetch} />
    )
  }

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Type not supported</h2>
        <p className="text-muted-foreground">The type "{type}" is not supported yet.</p>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId/$type/$id')({
  loader: async ({ params: { id, type, investigationId } }) => {
    const sketch = await services[type](id)
    return { params: { id, type, investigationId }, sketch }
  },

  pendingComponent: () => (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center flex items-center gap-2">
        <Loader />
      </div>
    </div>
  ),

  errorComponent: () => (
    <div className="h-full w-full flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-2">Oops! Something went wrong</h2>

        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
          We couldn't load this investigation page. This might be due to a network issue, invalid
          investigation ID, or the resource may not exist.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 
                                 px-4 py-2 rounded-md font-medium transition-colors
                                 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reload Page
          </button>
          <Link to="/dashboard">
            <button className="w-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-4 py-2 rounded-md font-medium transition-colors">
              Go home
            </button>
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">If the problem persists, try:</p>
          <ul className="text-xs text-muted-foreground mt-2 space-y-1">
            <li>• Checking your internet connection</li>
            <li>• Verifying the investigation ID is correct</li>
            <li>• Contacting support if the issue continues</li>
          </ul>
        </div>
      </div>
    </div>
  ),

  component: GraphPageContent
})
