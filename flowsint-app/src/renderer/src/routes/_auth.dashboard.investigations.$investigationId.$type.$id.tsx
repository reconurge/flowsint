import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import GraphPanel from '@/components/graphs/graph-panel'
import { sketchService } from '@/api/sketch-service'
import { useQuery } from '@tanstack/react-query'
import Loader from '@/components/loader'
import { analysisService } from '@/api/analysis-service'
import AnalysisPanel from '@/components/analyses/notes-panel'

const services = {
    graph: sketchService.getGraphDataById,
    analysis: analysisService.getById,
}
const GraphPageContent = () => {
    const { params: { type, id, investigationId } } = useLoaderData({
        from: '/_auth/dashboard/investigations/$investigationId/$type/$id',
    })

    const { data: graphData, isLoading } = useQuery({
        queryKey: ["investigations", investigationId, type, id, "data"],
        queryFn: () => services[type] || Promise.resolve(null),
        enabled: ["graph"].includes(type),
        refetchOnWindowFocus: false
    })

    if (type === "graph") {
        return <GraphPanel isLoading={isLoading} graphData={graphData} />
    }

    if (type === "analysis") {
        return <AnalysisPanel />
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
        <div className="h-full w-full flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive mb-2">
                    Error loading page
                </h2>
                <p className="text-muted-foreground">404 not found.</p>
            </div>
        </div>
    ),

    component: GraphPageContent
})
