import { fetchWithAuth } from './api'
import type { Chat, ChatDetail } from '@/types/chat'

export const chatCRUDService = {
  get: async (): Promise<Chat[]> => {
    return fetchWithAuth('/api/chats', {
      method: 'GET'
    })
  },
  getByInvestigationId: async (investigationId: string): Promise<Chat[]> => {
    return fetchWithAuth(`/api/chats/investigation/${investigationId}`, {
      method: 'GET'
    })
  },
  getById: async (chatId: string): Promise<ChatDetail> => {
    return fetchWithAuth(`/api/chats/${chatId}`, {
      method: 'GET'
    })
  },
  create: async (body: BodyInit): Promise<Chat> => {
    return fetchWithAuth(`/api/chats/create`, {
      method: 'POST',
      body: body
    })
  },
  delete: async (chatId: string): Promise<unknown> => {
    return fetchWithAuth(`/api/chats/${chatId}`, {
      method: 'DELETE'
    })
  }
}
