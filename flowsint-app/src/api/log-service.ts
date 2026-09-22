import { fetchWithAuth } from './api'
import type { Event } from '@/types/event'

export const logService = {
  get: async (sketch_id: string): Promise<Event[]> => {
    return fetchWithAuth(`/api/events/sketch/${sketch_id}/logs`, {
      method: 'GET'
    })
  },
  delete: async (sketch_id: string): Promise<unknown> => {
    return fetchWithAuth(`/api/events/sketch/${sketch_id}/logs`, {
      method: 'DELETE'
    })
  }
}
