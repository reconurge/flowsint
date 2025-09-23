// src/hooks/use-auth.ts
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authService } from '@/api/auth-service'
import { useAuthStore } from '@/stores/auth-store'

export const SESSION_QUERY_KEY = ['session']

export const useRegister = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  return useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setAuth(data.access_token, data.user)
      navigate({ to: '/' })
    },
    onError: (error) => {
      console.error('Erreur lors de l’inscription :', error)
    }
  })
}

export const useLogin = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.access_token, data.user)
      navigate({ to: '/' })
    }
  })
}

export const useLogout = () => {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()

  return () => {
    logout()
    queryClient.clear()
    navigate({ to: '/login' })
  }
}

export const useCurrentUser = () => {
  const token = useAuthStore((s) => s.token)
  const userFromStore = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()

  const result = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: authService.getCurrentUser,
    enabled: !!token && !userFromStore,
    staleTime: 5 * 60 * 1000,
    retry: false,
    initialData: userFromStore || undefined
  })

  if (result.isSuccess && result.data && token) {
    setAuth(token, result.data)
  }

  if (result.isError) {
    logout()
    queryClient.clear()
  }

  return {
    ...result,
    user: result.data || userFromStore,
    isLoggedIn: useAuthStore.getState().isAuthenticated
  }
}
