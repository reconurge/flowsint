// src/store/auth-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  email: string
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
}

// Create a custom storage that handles cross-tab synchronization
const createCrossTabStorage = () => {
  const storage = createJSONStorage(() => localStorage)

  // Listen for storage changes from other tabs
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth-storage') {
        try {
          // Force a re-render when auth state changes in another tab
          const parsed = JSON.parse(event.newValue || '{}')
          if (parsed.state) {
            useAuthStore.setState(parsed.state)
          }
        } catch (error) {
          console.error('Failed to parse cross-tab auth state:', error)
        }
      }
    })
  }

  return storage
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false })
    }),
    {
      name: 'auth-storage',
      storage: createCrossTabStorage()
    }
  )
)

// Initialize auth state from session storage on app load
if (typeof window !== 'undefined') {
  const storedAuth = localStorage.getItem('auth-storage')
  if (storedAuth) {
    try {
      const parsedAuth = JSON.parse(storedAuth)
      if (parsedAuth.state) {
        useAuthStore.setState(parsedAuth.state)
      }
    } catch (error) {
      console.error('Failed to parse stored auth state:', error)
      // Clear corrupted storage
      localStorage.removeItem('auth-storage')
    }
  }
}
