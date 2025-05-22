import { createFileRoute } from '@tanstack/react-router'
import { transformService } from '@/api/transfrom-service'
import TransformsLayout from '@/components/layout/transforms.layout'
import Editor from '@/components/transforms/editor'

export const Route = createFileRoute('/_auth/dashboard/transforms')({
    loader: async () => {
        return {
            transforms: await transformService.get(),
            nodesData: await transformService.getRawMaterial(),

        }
    },
    component: TranformsPage,
})


function TranformsPage() {
    const { transforms, nodesData } = Route.useLoaderData()
    return (
        <TransformsLayout nodesData={nodesData} transform={null} transforms={transforms}>
            <Editor />
        </TransformsLayout>
    )
}