import { fetchWithAuth } from './api'

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
