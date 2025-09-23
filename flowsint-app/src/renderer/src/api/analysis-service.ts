import { fetchWithAuth } from './api'

export const analysisService = {
  get: async (): Promise<any> => {
    return fetchWithAuth('/api/analyses', {
      method: 'GET'
    })
  },
  getByInvestigationId: async (investigationId: string): Promise<any> => {
    return fetchWithAuth(`/api/analyses/investigation/${investigationId}`, {
      method: 'GET'
    })
  },
  getById: async (analysisId: string): Promise<any> => {
    return fetchWithAuth(`/api/analyses/${analysisId}`, {
      method: 'GET'
    })
  },
  create: async (body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/analyses/create`, {
      method: 'POST',
      body: body
    })
  },
  update: async (analysisId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/analyses/${analysisId}`, {
      method: 'PUT',
      body: body
    })
  },
  delete: async (analysisId: string): Promise<any> => {
    return fetchWithAuth(`/api/analyses/${analysisId}`, {
      method: 'DELETE'
    })
  }
}
