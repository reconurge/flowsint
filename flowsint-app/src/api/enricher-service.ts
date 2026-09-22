import { fetchWithAuth } from './api'
import type { Enricher } from '@/types/enricher'

export const enricherService = {
  get: async (type?: string): Promise<Enricher[]> => {
    const url = type ? `/api/enrichers?category=${type}` : '/api/enrichers'
    return fetchWithAuth(url, {
      method: 'GET'
    })
  },
  // No current callers — kept for API parity, typed honestly rather than
  // guessed since nothing here reads the shape.
  getTemplates: async (): Promise<unknown> => {
    const url = '/api/enrichers/templates'
    return fetchWithAuth(url, {
      method: 'GET'
    })
  },
  getTemplateById: async (templateId: string): Promise<unknown> => {
    const url = `/api/enrichers/templates/${templateId}`
    return fetchWithAuth(url, {
      method: 'GET'
    })
  },
  launch: async (enricherName: string, body: BodyInit): Promise<unknown> => {
    return fetchWithAuth(`/api/enrichers/${enricherName}/launch`, {
      method: 'POST',
      body: body
    })
  }
}
