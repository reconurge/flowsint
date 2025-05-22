import { createFileRoute } from '@tanstack/react-router'
import { transformService } from '@/api/transfrom-service'
import Editor from '@/components/transforms/editor'
export const Route = createFileRoute('/_auth/dashboard/transforms/$transformId')({
    loader: async ({ params: { transformId } }) => {
        return {
            transform: await transformService.getById(transformId),
        }
    },
    component: TranformPage,
})

function TranformPage() {
    const { transform } = Route.useLoaderData()

    return (
        <Editor initialNodes={transform?.transform_schema?.nodes} initialEdges={transform?.transform_schema?.edges} />
    )
}