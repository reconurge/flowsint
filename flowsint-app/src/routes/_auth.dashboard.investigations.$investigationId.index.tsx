import { createFileRoute } from '@tanstack/react-router'
import { investigationService } from '@/api/investigation-service'


export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId/')({
    loader: async ({ params: { investigationId } }) => {
        return {
            investigation: await investigationService.getById(investigationId),
        }
    },
    component: InvestigationPage,
})

function InvestigationPage() {
    const { investigation } = Route.useLoaderData()
    return (
        <div>overview of {investigation.title} </div>
    )
}