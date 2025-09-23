import { fetchWithAuth } from './api'

export const flowService = {
  get: async (type?: string): Promise<any> => {
    const url = type ? `/api/flows?category=${type}` : '/api/flows'
    return fetchWithAuth(url, {
      method: 'GET'
    })
  },
  getById: async (flowId: string): Promise<any> => {
    return fetchWithAuth(`/api/flows/${flowId}`, {
      method: 'GET'
    })
  },
  create: async (body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/flows/create`, {
      method: 'POST',
      body: body
    })
  },
  update: async (flowId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/flows/${flowId}`, {
      method: 'PUT',
      body: body
    })
  },
  compute: async (flowId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/flows/${flowId}/compute`, {
      method: 'POST',
      body: body
    })
  },
  delete: async (flowId: string): Promise<any> => {
    return fetchWithAuth(`/api/flows/${flowId}`, {
      method: 'DELETE'
    })
  },
  launch: async (flowId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/flows/${flowId}/launch`, {
      method: 'POST',
      body: body
    })
  },
  getRawMaterial: async (): Promise<any> => {
    return fetchWithAuth(`/api/flows/raw_materials`, {
      method: 'GET'
    })
  },
  getRawMaterialForType: async (type: string): Promise<any> => {
    return fetchWithAuth(`/api/flows/input_type/${type}`, {
      method: 'GET'
    })
  }
}
