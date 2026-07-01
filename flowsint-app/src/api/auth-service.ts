import { useAuthStore } from '@/stores/auth-store'
import { fetchWithAuth } from './api'

export interface RegisterData {
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterResponse {
  message: string
  email: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: {
    id: string
    username: string
    email: string
  }
}

export const authService = {
  register: async (data: RegisterData): Promise<RegisterResponse> => {
    return fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    // Création d'un FormData ou URLSearchParams pour la requête d'authentification
    const formData = new URLSearchParams()
    formData.append('username', data.email)
    formData.append('password', data.password)

    return fetchWithAuth('/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    })
  },
  logout: () => {
    useAuthStore.getState().logout()
  },

  getCurrentUser: async () => {
    return fetchWithAuth('/api/auth/me')
  },

  updateProfile: async (data: { first_name?: string; last_name?: string; avatar_url?: string }) => {
    return fetchWithAuth('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  searchUsers: async (query: string) => {
    return fetchWithAuth(`/api/auth/users/search?q=${encodeURIComponent(query)}`)
  }
}
