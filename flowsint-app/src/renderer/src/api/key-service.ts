import { fetchWithAuth } from './api'

export const KeyService = {
  get: () => fetchWithAuth(`/api/keys`, { method: 'GET' }),
  getById: (key_id: string) => fetchWithAuth(`/api/keys/${key_id}`, { method: 'GET' }),
  create: (data: { name: string; key: string }) =>
    fetchWithAuth(`/api/keys/create`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deleteById: (key_id: string) => fetchWithAuth(`/api/keys/${key_id}`, { method: 'DELETE' })
}
