import { fetchWithAuth } from './api'
import type { Investigation, Collaborator } from '@/types/investigation'

export const investigationService = {
  get: async (): Promise<Investigation[]> => {
    return fetchWithAuth('/api/investigations', {
      method: 'GET'
    })
  },
  getById: async (investigationId: string): Promise<Investigation> => {
    return fetchWithAuth(`/api/investigations/${investigationId}`, {
      method: 'GET'
    })
  },
  // Backend returns the created investigation on success, or an { error }
  // payload instead of a 4xx/5xx status on failure — callers branch on `id`.
  create: async (body: BodyInit): Promise<Investigation | { error: string }> => {
    return fetchWithAuth(`/api/investigations/create`, {
      method: 'POST',
      body: body
    })
  },
  delete: async (investigationId: string): Promise<unknown> => {
    return fetchWithAuth(`/api/investigations/${investigationId}`, {
      method: 'DELETE'
    })
  },

  // Collaborator management
  getCollaborators: async (investigationId: string): Promise<Collaborator[]> => {
    return fetchWithAuth(`/api/investigations/${investigationId}/collaborators`, {
      method: 'GET'
    })
  },
  addCollaborator: async (
    investigationId: string,
    body: { email: string; role: string }
  ): Promise<unknown> => {
    return fetchWithAuth(`/api/investigations/${investigationId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },
  updateCollaboratorRole: async (
    investigationId: string,
    userId: string,
    body: { role: string }
  ): Promise<unknown> => {
    return fetchWithAuth(`/api/investigations/${investigationId}/collaborators/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  },
  removeCollaborator: async (investigationId: string, userId: string): Promise<unknown> => {
    return fetchWithAuth(`/api/investigations/${investigationId}/collaborators/${userId}`, {
      method: 'DELETE'
    })
  }
}
