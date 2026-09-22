import { fetchWithAuth } from './api'
import type { Analysis } from '@/types/analysis'

export const analysisService = {
  get: async (): Promise<Analysis[]> => {
    return fetchWithAuth('/api/analyses', {
      method: 'GET'
    })
  },
  getByInvestigationId: async (investigationId: string): Promise<Analysis[]> => {
    return fetchWithAuth(`/api/analyses/investigation/${investigationId}`, {
      method: 'GET'
    })
  },
  getById: async (analysisId: string): Promise<Analysis> => {
    return fetchWithAuth(`/api/analyses/${analysisId}`, {
      method: 'GET'
    })
  },
  // Backend returns the created analysis on success, or an { error }
  // payload instead of a 4xx/5xx status on failure — callers branch on `id`.
  create: async (body: BodyInit): Promise<Analysis | { error: string }> => {
    return fetchWithAuth(`/api/analyses/create`, {
      method: 'POST',
      body: body
    })
  },
  update: async (analysisId: string, body: BodyInit): Promise<Analysis> => {
    return fetchWithAuth(`/api/analyses/${analysisId}`, {
      method: 'PUT',
      body: body
    })
  },
  delete: async (analysisId: string): Promise<unknown> => {
    return fetchWithAuth(`/api/analyses/${analysisId}`, {
      method: 'DELETE'
    })
  }
}
