import {
    Outlet,
    createFileRoute,
} from '@tanstack/react-router'

import { requireAuth } from '@/lib/auth-utils'

export const Route = createFileRoute('/_auth')({
    beforeLoad: ({ location }) => {
        requireAuth(location.href)
    },
    component: AuthLayout,
})

function AuthLayout() {
    return (
        <Outlet />
    )
}
