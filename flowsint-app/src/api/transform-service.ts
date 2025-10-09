import { fetchWithAuth } from './api'

export const transformService = {
  get: async (type?: string): Promise<any> => {
    const url = type ? `/api/transforms?category=${type}` : '/api/transforms'
    return fetchWithAuth(url, {
      method: 'GET'
    })
  },
  launch: async (transformName: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/transforms/${transformName}/launch`, {
      method: 'POST',
      body: body
    })
  }
}
