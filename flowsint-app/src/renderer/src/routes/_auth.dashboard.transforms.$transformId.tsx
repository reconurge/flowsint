import { createFileRoute } from '@tanstack/react-router'
import { transformService } from '@/api/transfrom-service'
import Editor from '@/components/transforms/editor'
import Loader from '@/components/loader'
import { useEffect } from 'react'
import { useLayoutStore } from '@/stores/layout-store'

export const Route = createFileRoute('/_auth/dashboard/transforms/$transformId')({
    loader: async ({ params: { transformId } }) => {
        return {
            transform: await transformService.getById(transformId),
        }
    },
    component: TranformPage,
    pendingComponent: () => (
        <div className="h-full w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader />
                <p className="text-muted-foreground">Loading transform...</p>
            </div>
        </div>
    ),
    errorComponent: ({ error }) => (
        <div className="h-full w-full flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive mb-2">
                    Error loading transform
                </h2>
                <p className="text-muted-foreground">{error.message}</p>
            </div>
        </div>
    ),
})

function TranformPage() {
    const { transform } = Route.useLoaderData()
    const setActiveTransformTab = useLayoutStore((s) => s.setActiveTransformTab)

    useEffect(() => {
        setActiveTransformTab("items")
    }, [setActiveTransformTab])

    return (
        <Editor
            key={transform.id}
            transform={transform}
            initialNodes={transform?.transform_schema?.nodes}
            initialEdges={transform?.transform_schema?.edges}
        />
    )
}