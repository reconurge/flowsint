import { useEffect } from 'react'
import { Outlet, useNavigate, createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'

const TOKEN_EXPIRY_MINUTES = 60

export const Route = createFileRoute('/middleware')({
  component: AuthLayout
})

function AuthLayout() {
  const navigate = useNavigate()
  const { token, isAuthenticated, logout } = useAuthStore()

  useEffect(() => {
    // Protection contre le clickjacking
    if (window.self !== window.top) {
      console.error('Cette application ne peut pas être chargée dans un iframe')
      logout()
      return
    }

    if (!isAuthenticated || !token) {
      navigate({ to: '/login' })
      return
    }

    // Vérifier si le token est expiré
    // Note: Dans un système de production, vous devriez implémenter un refresh token
    // au lieu de forcer une déconnexion
    const checkTokenExpiry = () => {
      try {
        // Décodage simple du token JWT (partie payload)
        // Dans un système réel, vous pourriez utiliser une bibliothèque comme jwt-decode
        const payload = JSON.parse(atob(token.split('.')[1]))

        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.warn('Session expirée')
          logout()
          navigate({ to: '/login' })
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du token', error)
        logout()
        navigate({ to: '/login' })
      }
    }

    // Vérifier l'expiration du token au démarrage
    checkTokenExpiry()

    // Vérifier périodiquement l'expiration du token
    const interval = setInterval(checkTokenExpiry, TOKEN_EXPIRY_MINUTES * 60 * 1000)

    return () => clearInterval(interval)
  }, [token, isAuthenticated, logout, navigate])

  // Render children routes with the Outlet component
  return <Outlet />
}
