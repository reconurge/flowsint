import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import GraphPanel from '@/components/graphs/graph-panel'
import { sketchService } from '@/api/sketch-service'
import { useQuery } from '@tanstack/react-query'

const GraphPageContent = () => {
    const { params: { type, id, investigationId } } = useLoaderData({
        from: '/_auth/dashboard/investigations/$investigationId/$type/$id',
    })

    const { data: graphData, isLoading } = useQuery({
        queryKey: ["investigations", investigationId, type, id, "data"],
        queryFn: () => type === "graph" ? sketchService.getGraphDataById(id) : Promise.resolve(null),
        enabled: type === "graph",
        refetchOnWindowFocus: false
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

    return <GraphPanel isLoading={isLoading} graphData={graphData} />
}

export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId/$type/$id')({
    loader: async ({ params: { id, type, investigationId } }) => {
        const sketch = await sketchService.getById(id)
        return { params: { id, type, investigationId }, sketch }
    },

    pendingComponent: () => (
        <div className="h-full w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <p className="text-muted-foreground">Loading...</p>
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
