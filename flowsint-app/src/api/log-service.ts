import { fetchWithAuth } from './api'

export const logService = {
  get: async (sketch_id: string): Promise<any> => {
    return fetchWithAuth(`/api/events/sketch/${sketch_id}/logs`, {
      method: 'GET'
    })
  },
  delete: async (sketch_id: string): Promise<any> => {
    return fetchWithAuth(`/api/events/sketch/${sketch_id}/logs`, {
      method: 'DELETE'
    })
  }
}
