import { fetchWithAuth } from './api'

export const sketchService = {
  get: async (): Promise<any> => {
    return fetchWithAuth('/api/sketches', {
      method: 'GET'
    })
  },
  getById: async (sketchId: string): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}`, {
      method: 'GET'
    })
  },
  getGraphDataById: async (sketchId: string, inline: boolean = false): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/graph?format=${inline ? 'inline' : ''}`, {
      method: 'GET'
    })
  },
  create: async (body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/sketches/create`, {
      method: 'POST',
      body: body
    })
  },
  delete: async (sketchId: string): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}`, {
      method: 'DELETE'
    })
  },
  addNode: async (sketchId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes/add`, {
      method: 'POST',
      body: body
    })
  },
  addEdge: async (sketchId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/relations/add`, {
      method: 'POST',
      body: body
    })
  },
  mergeNodes: async (sketchId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes/merge`, {
      method: 'POST',
      body: body
    })
  },
  deleteNodes: async (sketchId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes`, {
      method: 'DELETE',
      body: body
    })
  },
  updateNode: async (sketchId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes/edit`, {
      method: 'PUT',
      body: body
    })
  },
  getNodeNeighbors: async (sketchId: string, nodeId: string): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes/${nodeId}`, {
      method: 'GET'
    })
  },
  types: async (): Promise<any> => {
    return fetchWithAuth(`/api/types`, {
      method: 'GET'
    })
  },
  update: async (sketchId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}`, {
      method: 'PUT',
      body: body
    })
  },
  analyzeImportFile: async (sketchId: string, file: File): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)

    return fetchWithAuth(`/api/sketches/${sketchId}/import/analyze`, {
      method: 'POST',
      body: formData
    })
  },
  executeImport: async (
    sketchId: string,
    file: File,
    entityMappings: Array<{ row_index: number; entity_type: string; include: boolean; label?: string }>,
  ): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_mappings_json', JSON.stringify(entityMappings))

    return fetchWithAuth(`/api/sketches/${sketchId}/import/execute`, {
      method: 'POST',
      body: formData
    })
  }
}
