import { fetchWithAuth } from './api'
import type { Flow, ComputeFlowResult } from '@/types/flow'
import type { Enricher, EnricherData } from '@/types/enricher'

export const flowService = {
  get: async (type?: string): Promise<Flow[]> => {
    const url = type ? `/api/flows?category=${type}` : '/api/flows'
    return fetchWithAuth(url, {
      method: 'GET'
    })
  },
  getById: async (flowId: string): Promise<Flow> => {
    return fetchWithAuth(`/api/flows/${flowId}`, {
      method: 'GET'
    })
  },
  create: async (body: BodyInit): Promise<Flow> => {
    return fetchWithAuth(`/api/flows/create`, {
      method: 'POST',
      body: body
    })
  },
  update: async (flowId: string, body: BodyInit): Promise<Flow> => {
    return fetchWithAuth(`/api/flows/${flowId}`, {
      method: 'PUT',
      body: body
    })
  },
  compute: async (flowId: string, body: BodyInit): Promise<ComputeFlowResult> => {
    return fetchWithAuth(`/api/flows/${flowId}/compute`, {
      method: 'POST',
      body: body
    })
  },
  delete: async (flowId: string): Promise<unknown> => {
    return fetchWithAuth(`/api/flows/${flowId}`, {
      method: 'DELETE'
    })
  },
  launch: async (flowId: string, body: BodyInit): Promise<unknown> => {
    return fetchWithAuth(`/api/flows/${flowId}/launch`, {
      method: 'POST',
      body: body
    })
  },
  // Raw materials are enrichers grouped by input type — the pool a flow's
  // "type" nodes can be built from, not flows themselves.
  getRawMaterial: async (): Promise<EnricherData> => {
    return fetchWithAuth(`/api/flows/raw_materials`, {
      method: 'GET'
    })
  },
  // Unlike getRawMaterial, this endpoint already filters to one input
  // type, so it returns a flat list instead of grouping by category.
  getRawMaterialForType: async (type: string): Promise<{ items: Enricher[] }> => {
    return fetchWithAuth(`/api/flows/input_type/${type}`, {
      method: 'GET'
    })
  }
}
