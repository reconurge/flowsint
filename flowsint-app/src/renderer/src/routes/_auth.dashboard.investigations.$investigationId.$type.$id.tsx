import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import GraphPanel from '@/components/graphs/graph-panel'
import { sketchService } from '@/api/sketch-service'
import type { InvestigationGraph } from '@/types'

// Get queryClient from where it's initialized
import { getContext } from '@/integrations/tanstack-query/root-provider'

const { queryClient } = getContext();

const GraphPageContent = () => {
    const { params: { type } } = useLoaderData({
        from: '/_auth/dashboard/investigations/$investigationId/$type/$id',
    })

    if (type !== "graph") {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-lg font-semibold mb-2">Type not supported</h2>
                    <p className="text-muted-foreground">The type "{type}" is not supported yet.</p>
                </div>
            </div>
        )
    }

    return <GraphPanel />
}

export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId/$type/$id')({
    loader: async ({ params: { id, type, investigationId } }) => {
        // Start both requests in parallel
        const [sketch, graphData] = await Promise.all([
            sketchService.getById(id),
            type === "graph" ? sketchService.getGraphDataById(id) : Promise.resolve(null)
        ])

        // Update cache
        queryClient.setQueryData(["investigations", investigationId, type, id], sketch)
        if (graphData) {
            queryClient.setQueryData<InvestigationGraph>(
                ["investigations", investigationId, type, id, "data"],
                graphData as InvestigationGraph
            )
        }

        return { params: { id, type, investigationId }, sketch, graphData }
    },

    pendingComponent: () => (
        <div className="h-full w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                {/* <Loader /> */}
                <p className="text-muted-foreground">Loading page...</p>
            </div>
        </div>
    ),

    errorComponent: ({ error }) => (
        <div className="h-full w-full flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive mb-2">
                    Error loading page
                </h2>
                <p className="text-muted-foreground">{error.message}</p>
            </div>
        </div>
    ),

    component: GraphPageContent
})
