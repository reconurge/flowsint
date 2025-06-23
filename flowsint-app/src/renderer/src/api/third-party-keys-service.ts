import { fetchWithAuth } from './api'

export const ThirdPartyKeysService = {
    get: () => fetchWithAuth(`/api/third_party_keys`, { method: 'GET' }),
    getServices: () => fetchWithAuth(`/api/third_party_keys/services`, { method: 'GET' }),
    getById: (key_id: string) => fetchWithAuth(`/api/third_party_keys/${key_id}`, { method: 'GET' }),
    create: (data: { service: string; key: string }) => fetchWithAuth(`/api/third_party_keys/create`, { 
        method: 'POST', 
        body: JSON.stringify(data) 
    }),
    deleteById: (key_id: string) => fetchWithAuth(`/api/third_party_keys/${key_id}`, { method: 'DELETE' }),
}