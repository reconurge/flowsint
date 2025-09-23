import { fetchWithAuth } from './api'

export const scanService = {
  get: (scan_id: string) => fetchWithAuth(`/api/scans/${scan_id}`, { method: 'GET' }),
  delete: (scan_id: string) => fetchWithAuth(`/api/scans/${scan_id}`, { method: 'DELETE' }),
  getSketchScans: (sketch_id: string) =>
    fetchWithAuth(`/api/scans/sketch/${sketch_id}`, { method: 'GET' }),
  deleteAll: () => fetchWithAuth('/api/scans/all', { method: 'DELETE' })
}
