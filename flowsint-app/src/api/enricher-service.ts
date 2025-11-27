import { fetchWithAuth } from './api'

export const enricherService = {
  get: async (type?: string): Promise<any> => {
    const url = type ? `/api/enrichers?category=${type}` : '/api/enrichers'
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
