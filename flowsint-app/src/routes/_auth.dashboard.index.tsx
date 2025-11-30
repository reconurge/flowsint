import { createFileRoute } from '@tanstack/react-router'
import { InvestigationSkeleton } from '@/components/dashboard/investigation/investigation-skeleton'
import { DashboardPage } from '@/components/dashboard/overview/dashboard-page'

export const Route = createFileRoute('/_auth/dashboard/')({
  component: Page,
  pendingComponent: InvestigationSkeleton
})

function Page() {
  return (
    <DashboardPage />
  )
}
