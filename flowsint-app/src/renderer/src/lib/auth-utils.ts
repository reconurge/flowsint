import { useAuthStore } from '@/stores/auth-store'
import { redirect } from '@tanstack/react-router'
import type { User } from '@/stores/auth-store'

export function requireAuth(locationHref: string) {
    const isAuth = useAuthStore.getState().isAuthenticated
    const token = useAuthStore.getState().token

    if (!isAuth || !token) {
        throw redirect({
            to: '/login',
            search: {
                redirect: locationHref,
            },
        })
    }
}

export function isAuthenticated(): boolean {
    const isAuth = useAuthStore.getState().isAuthenticated
    const token = useAuthStore.getState().token
    return Boolean(isAuth && token)
}

export function getAuthToken(): string | null {
    return useAuthStore.getState().token
}

export function getUser(): User | null {
    return useAuthStore.getState().user
}
