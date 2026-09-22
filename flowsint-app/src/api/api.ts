import { useAuthStore } from '@/stores/auth-store'

const API_URL = import.meta.env.VITE_API_URL ?? ''

// Return type is genuinely per-endpoint — every sketchService/flowService/...
// caller declares its own real return type and relies on this resolving
// structurally against it. A generic here would need an explicit type
// argument at every call site across the whole app for no real gain.
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = useAuthStore.getState().token

  // Check if body is FormData - if so, don't set Content-Type (browser will set it with boundary)
  const isFormData = options.body instanceof FormData
  const defaultHeaders: HeadersInit = {}
  if (!isFormData) {
    defaultHeaders['Content-Type'] = 'application/json'
  }
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)
  if (response.status === 401) {
    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new Error('Session expired, login again.')
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Erreur ${response.status}`)
  }
  if (response.status === 204) {
    return null
  }
  return await response.json()
}
