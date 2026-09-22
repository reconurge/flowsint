import { fetchWithAuth } from './api'
import type {
  Sketch,
  SketchGraphData,
  DetectionResult,
  EntityMapping,
  PreviewEdge,
  ImportAnalysisResult,
  ImportExecutionResult,
  RelationshipType
} from '@/types'
import type { GraphNode } from '@/types/graph'
import type { ActionItem } from '@/lib/action-items'

// `inline=true` asks the backend for the relationships-already-joined
// shape (used by the flat table view) instead of the default {nds, rls}
// graph slice — the response shape genuinely depends on that flag, hence
// the overload rather than a single loosely-typed union return.
async function getGraphDataById(sketchId: string, inline: true): Promise<RelationshipType[]>
async function getGraphDataById(sketchId: string, inline?: false): Promise<SketchGraphData>
async function getGraphDataById(
  sketchId: string,
  inline: boolean = false
): Promise<SketchGraphData | RelationshipType[]> {
  return fetchWithAuth(`/api/sketches/${sketchId}/graph?format=${inline ? 'inline' : ''}`, {
    method: 'GET'
  })
}

export const sketchService = {
  get: async (): Promise<Sketch[]> => {
    return fetchWithAuth('/api/sketches', {
      method: 'GET'
    })
  },
  getById: async (sketchId: string): Promise<Sketch> => {
    return fetchWithAuth(`/api/sketches/${sketchId}`, {
      method: 'GET'
    })
  },
  getGraphDataById,
  // Backend returns the created sketch on success, or an { error } payload
  // instead of a 4xx/5xx status on failure — callers branch on `id`.
  create: async (body: BodyInit): Promise<Sketch | { error: string }> => {
    return fetchWithAuth(`/api/sketches/create`, {
      method: 'POST',
      body: body
    })
  },
  delete: async (sketchId: string): Promise<unknown> => {
    return fetchWithAuth(`/api/sketches/${sketchId}`, {
      method: 'DELETE'
    })
  },
  addNode: async (sketchId: string, body: BodyInit): Promise<{ node: GraphNode }> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes/add`, {
      method: 'POST',
      body: body
    })
  },
  addEdge: async (sketchId: string, body: BodyInit): Promise<unknown> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/relations/add`, {
      method: 'POST',
      body: body
    })
  },
  mergeNodes: async (sketchId: string, body: BodyInit): Promise<unknown> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes/merge`, {
      method: 'POST',
      body: body
    })
  },
  deleteNodes: async (sketchId: string, body: BodyInit): Promise<unknown> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes`, {
      method: 'DELETE',
      body: body
    })
  },
  deleteEdges: async (sketchId: string, body: BodyInit): Promise<unknown> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/relationships`, {
      method: 'DELETE',
      body: body
    })
  },
  updateNode: async (sketchId: string, body: BodyInit): Promise<{ status: string }> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes/edit`, {
      method: 'PUT',
      body: body
    })
  },
  updateEdge: async (sketchId: string, body: BodyInit): Promise<unknown> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/relationships/edit`, {
      method: 'PUT',
      body: body
    })
  },
  getNodeNeighbors: async (sketchId: string, nodeId: string): Promise<SketchGraphData> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes/${nodeId}`, {
      method: 'GET'
    })
  },
  types: async (flat = false): Promise<ActionItem[]> => {
    return fetchWithAuth(`/api/types${flat ? '?flat=true' : ''}`, {
      method: 'GET'
    })
  },
  detectType: async (text: string): Promise<DetectionResult> => {
    return fetchWithAuth(`/api/types/detect`, {
      method: 'POST',
      body: JSON.stringify({ text })
    })
  },
  update: async (sketchId: string, body: BodyInit): Promise<Sketch> => {
    return fetchWithAuth(`/api/sketches/${sketchId}`, {
      method: 'PUT',
      body: body
    })
  },
  analyzeImportFile: async (sketchId: string, file: File): Promise<ImportAnalysisResult> => {
    const formData = new FormData()
    formData.append('file', file)

    return fetchWithAuth(`/api/sketches/${sketchId}/import/analyze`, {
      method: 'POST',
      body: formData
    })
  },
  executeImport: async (
    sketchId: string,
    entityMappings: EntityMapping[],
    edges: PreviewEdge[]
  ): Promise<ImportExecutionResult> => {
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
  ): Promise<unknown> => {
    return fetchWithAuth(`/api/sketches/${sketchId}/nodes/positions`, {
      method: 'PUT',
      body: JSON.stringify({ positions })
    })
  },
  exportSketch: async (sketchId: string, format: 'json' = 'json'): Promise<unknown> => {
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
