import { createFileRoute } from '@tanstack/react-router'
import { investigationService } from '@/api/investigation-service'
import { GraphTabs } from '@/components/investigations/graph-tabs'
import GraphPanel from '@/components/investigations/graph-panel'
import InvestigationsLayout from '@/components/layout/investigations.layout'
import z from 'zod'
import { useActiveTabId } from '@/hooks/active-tab-helper'
export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId')({
    loader: async ({ params: { investigationId } }) => {
        return {
            investigation: await investigationService.getById(investigationId),
        }
    },
    component: InvestigationPage,
    validateSearch: z.object({
        graph: z.string().optional(),
    }),
})

function InvestigationPage() {
    const activeTabId = useActiveTabId()
    return (
        <InvestigationsLayout>
            <GraphTabs />
            <div className='grow h-full w-full overflow-hidden flex flex-col'>
                <div className='grow'>
                    {activeTabId ?
                        <GraphPanel />
                        : <div className='h-full w-full flex items-center justify-center'>Rien</div>
                    }
                </div>
            </div>
        </InvestigationsLayout>
    )
}