import RootLayout from '@/components/layout/root.layout'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/dashboard')({
    component: DashboardPage,
})

function DashboardPage() {
    return (
        <RootLayout>
            <Outlet />
        </RootLayout>
    )
}
