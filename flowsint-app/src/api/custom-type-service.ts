import { fetchWithAuth } from './api'

export interface CustomType {
  id: string
  name: string
  owner_id: string
  schema: Record<string, any>
  status: 'draft' | 'published' | 'archived'
  checksum?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface CustomTypeCreate {
  name: string
  schema: Record<string, any>
  description?: string
  status?: 'draft' | 'published'
}

export interface CustomTypeUpdate {
  name?: string
  schema?: Record<string, any>
  description?: string
  status?: 'draft' | 'published' | 'archived'
}

export interface ValidatePayload {
  payload: Record<string, any>
}

export interface ValidateResponse {
  valid: boolean
  errors?: string[]
}

export const customTypeService = {
  // List all custom types (optionally filtered by status)
  list: async (status?: string): Promise<CustomType[]> => {
    const url = status ? `/api/custom-types?status=${status}` : '/api/custom-types'
    return fetchWithAuth(url, {
      method: 'GET'
    })
  },

  // Get a specific custom type by ID
  getById: async (id: string): Promise<CustomType> => {
    return fetchWithAuth(`/api/custom-types/${id}`, {
      method: 'GET'
    })
  },

  // Get the raw JSON Schema for a custom type
  getSchema: async (id: string): Promise<Record<string, any>> => {
    return fetchWithAuth(`/api/custom-types/${id}/schema`, {
      method: 'GET'
    })
  },

  // Create a new custom type
  create: async (data: CustomTypeCreate): Promise<CustomType> => {
    return fetchWithAuth('/api/custom-types', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // Update an existing custom type
  update: async (id: string, data: CustomTypeUpdate): Promise<CustomType> => {
    return fetchWithAuth(`/api/custom-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  // Delete a custom type
  delete: async (id: string): Promise<void> => {
    return fetchWithAuth(`/api/custom-types/${id}`, {
      method: 'DELETE'
    })
  },

  // Validate a payload against a custom type's schema
  validate: async (id: string, data: ValidatePayload): Promise<ValidateResponse> => {
    return fetchWithAuth(`/api/custom-types/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
}
