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
  },

  // Collaborator management
  getCollaborators: async (investigationId: string): Promise<any> => {
    return fetchWithAuth(`/api/investigations/${investigationId}/collaborators`, {
      method: 'GET'
    })
  },
  addCollaborator: async (investigationId: string, body: { email: string; role: string }): Promise<any> => {
    return fetchWithAuth(`/api/investigations/${investigationId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },
  updateCollaboratorRole: async (investigationId: string, userId: string, body: { role: string }): Promise<any> => {
    return fetchWithAuth(`/api/investigations/${investigationId}/collaborators/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  },
  removeCollaborator: async (investigationId: string, userId: string): Promise<any> => {
    return fetchWithAuth(`/api/investigations/${investigationId}/collaborators/${userId}`, {
      method: 'DELETE'
    })
  }
}
