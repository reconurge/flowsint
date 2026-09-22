import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import { CaseOverviewPage } from '@/components/dashboard/investigation/case-overview-page'

export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId/')({
  component: InvestigationPage
})

function InvestigationPage() {
  const { investigation } = useLoaderData({
    from: '/_auth/dashboard/investigations/$investigationId'
  })

  return <CaseOverviewPage investigation={investigation} />
}
