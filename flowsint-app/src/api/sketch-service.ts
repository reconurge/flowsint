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
  deleteEdges: async (sketchId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/relationships`, {
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
  updateEdge: async (sketchId: string, body: BodyInit): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/relationships/edit`, {
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
    entityMappings: Array<{
      id: string
      entity_type: string
      include: boolean
      nodeLabel: string
      node_id?: string
      data: Record<string, any>
    }>,
    edges: any
  ): Promise<any> => {
    const formData = new FormData()
    formData.append('entity_mappings_json', JSON.stringify({ nodes: entityMappings, edges: edges }))

    return fetchWithAuth(`/api/sketches/${sketchId}/import/execute`, {
      method: 'POST',
      body: formData
    })
  },
  updateNodePositions: async (
    sketchId: string,
    positions: Array<{ nodeId: string; x: number; y: number }>
  ): Promise<any> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes/positions`, {
      method: 'PUT',
      body: JSON.stringify({ positions })
    })
  },
  exportSketch: async (sketchId: string, format: 'json' = 'json'): Promise<any> => {
    const response = await fetchWithAuth(`/api/sketches/${sketchId}/export?format=${format}`, {
      method: 'GET'
    })

    if (format === 'json') {
      const data = await response
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sketch-${sketchId}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }

    return response
  }
}
