import { useAuthStore } from '@/stores/auth-store'
import { fetchWithAuth } from './api'

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface LoginData {
  username: string
  password: string
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
  register: async (data: RegisterData): Promise<AuthResponse> => {
    return fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    // Création d'un FormData ou URLSearchParams pour la requête d'authentification
    const formData = new URLSearchParams()
    formData.append('username', data.username)
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
    return fetchWithAuth('/api/users/me')
  }
}
