import { fetchWithAuth } from './api'
import type { TemplateData } from '@/components/templates/template-schema'

export interface Template {
  id: string
  name: string
  category: string
  version: number
  content: TemplateData
  is_public: boolean
  owner_id: string
  created_at: string
  updated_at: string
  description: string
}

export interface CreateTemplatePayload {
  name: string
  category: string
  version?: number
  content: TemplateData
  is_public?: boolean
}

export interface UpdateTemplatePayload {
  name?: string
  category?: string
  version?: number
  content?: TemplateData
  is_public?: boolean
}

export interface TestTemplateResponse {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  duration_ms: number
  status_code?: number
  url: string
}

export const templateService = {
  getAll: async (): Promise<Template[]> => {
    return fetchWithAuth('/api/enrichers/templates', {
      method: 'GET'
    })
  },

  getById: async (templateId: string): Promise<Template> => {
    return fetchWithAuth(`/api/enrichers/templates/${templateId}`, {
      method: 'GET'
    })
  },

  create: async (payload: CreateTemplatePayload): Promise<Template> => {
    return fetchWithAuth('/api/enrichers/templates', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  update: async (templateId: string, payload: UpdateTemplatePayload): Promise<Template> => {
    return fetchWithAuth(`/api/enrichers/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  delete: async (templateId: string): Promise<void> => {
    return fetchWithAuth(`/api/enrichers/templates/${templateId}`, {
      method: 'DELETE'
    })
  },

  test: async (templateId: string, inputValue: string): Promise<TestTemplateResponse> => {
    return fetchWithAuth(`/api/enrichers/templates/${templateId}/test`, {
      method: 'POST',
      body: JSON.stringify({ input_value: inputValue })
    })
  },

  testContent: async (inputValue: string, content: TemplateData): Promise<TestTemplateResponse> => {
    return fetchWithAuth('/api/enrichers/templates/test', {
      method: 'POST',
      body: JSON.stringify({ input_value: inputValue, content })
    })
  }
}
