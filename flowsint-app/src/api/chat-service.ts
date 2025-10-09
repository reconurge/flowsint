import { fetchWithAuth } from './api'
import { useAuthStore } from '@/stores/auth-store'

export interface ChatResponse {
  content: string
}

export class ChatService {
  private static instance: ChatService

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  async streamChat(
    chatId: string,
    prompt: string,
    onChunk: (content: string) => void,
    context?: any
  ): Promise<string> {
    const token = useAuthStore.getState().token
    const API_URL = import.meta.env.VITE_API_URL

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}/api/chats/stream/${chatId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        context
      })
    })

    if (response.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
      throw new Error('Session expired, login again.')
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Error ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      console.error('No reader available')
      throw new Error('No reader available')
    }

    let accumulatedContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      const text = new TextDecoder().decode(value)
      const lines = text.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            return accumulatedContent
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              accumulatedContent += parsed.content
              onChunk(accumulatedContent)
            }
          } catch (e) {
            console.error('Error parsing SSE data:', data, e)
          }
        }
      }
    }

    return accumulatedContent
  }
}

export const chatService = ChatService.getInstance()

export const chatCRUDService = {
  get: async (): Promise<any> => {
    return fetchWithAuth('/api/chats', {
      method: 'GET'
    })
  },
  getByInvestigationId: async (investigationId: string): Promise<any> => {
    return fetchWithAuth(`/api/chats/investigation/${investigationId}`, {
      method: 'GET'
    })
  },
  getById: async (chatId: string): Promise<any> => {
    return fetchWithAuth(`/api/chats/${chatId}`, {
      method: 'GET'
    })
  },
  create: async (body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/chats/create`, {
      method: 'POST',
      body: body
    })
  },
  delete: async (chatId: string): Promise<any> => {
    return fetchWithAuth(`/api/chats/${chatId}`, {
      method: 'DELETE'
    })
  }
}
