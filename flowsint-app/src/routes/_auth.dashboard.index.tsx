import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/dashboard/')({
    component: DashboardPage,
})

function DashboardPage() {
    
    return (
        <div>only seable a home</div>
    )
}
