import { fetchWithAuth } from './api'

export const enricherService = {
  get: async (type?: string): Promise<any> => {
    const url = type ? `/api/enrichers?category=${type}` : '/api/enrichers'
    return fetchWithAuth(url, {
      method: 'GET'
    })
  },
  getTemplates: async (): Promise<any> => {
    const url = '/api/enrichers/templates'
    return fetchWithAuth(url, {
      method: 'GET'
    })
  },
  getTemplateById: async (templateId: string): Promise<any> => {
    const url = `/api/enrichers/templates/${templateId}`
    return fetchWithAuth(url, {
      method: 'GET'
    })
  },
  launch: async (enricherName: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/enrichers/${enricherName}/launch`, {
      method: 'POST',
      body: body
    })
  }
}
