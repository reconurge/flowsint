import { create } from 'zustand'
import { SaveStatus } from '@/hooks/use-save-node-positions'

interface GraphSaveStatusStore {
  saveStatus: SaveStatus
  setSaveStatus: (status: SaveStatus) => void
}

export const useGraphSaveStatus = create<GraphSaveStatusStore>((set) => ({
  saveStatus: 'idle',
  setSaveStatus: (status) => set({ saveStatus: status })
}))
