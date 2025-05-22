import { useAuthStore } from '@/store/auth-store'
import { redirect } from '@tanstack/react-router'

export function requireAuth(locationHref: string) {
    const isAuth = useAuthStore.getState().isAuthenticated
    if (!isAuth) {
        throw redirect({
            to: '/login',
            search: {
                redirect: locationHref,
            },
        })
    }
}
