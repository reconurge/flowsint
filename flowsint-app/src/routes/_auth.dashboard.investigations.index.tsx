import { createFileRoute } from '@tanstack/react-router'
import { investigationService } from '@/api/investigation-service'
import z from 'zod'

export const Route = createFileRoute('/_auth/dashboard/investigations/')({
    loader: async () => {
        return {
            investigations: await investigationService.get(),
        }
    },
    component: InvestigationPage,
    validateSearch: z.object({
        graph: z.string().optional(),
    }),
})

function InvestigationPage() {
    const { investigations } = Route.useLoaderData()
    return (
        <div>{investigations.length}</div>
    )
}