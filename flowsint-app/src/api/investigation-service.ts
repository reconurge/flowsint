import { fetchWithAuth } from './api'

export const investigationService = {
  get: async (): Promise<any> => {
    return fetchWithAuth('/api/investigations', {
      method: 'GET'
    })
  },
  getById: async (investigationId: string): Promise<any> => {
    return fetchWithAuth(`/api/investigations/${investigationId}`, {
      method: 'GET'
    })
  },
  getStatistics: async (investigationId: string): Promise<any> => {
    return fetchWithAuth(`/api/investigations/${investigationId}/statistics`, {
      method: 'GET'
    })
  },
  create: async (body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/investigations/create`, {
      method: 'POST',
      body: body
    })
  },
  delete: async (investigationId: string): Promise<any> => {
    return fetchWithAuth(`/api/investigations/${investigationId}`, {
      method: 'DELETE'
    })
  }
}
