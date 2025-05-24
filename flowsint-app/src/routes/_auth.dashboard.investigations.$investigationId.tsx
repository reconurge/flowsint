import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId')({
    component: InvestigationPage,
})

function InvestigationPage() {
    return <Outlet />
}
