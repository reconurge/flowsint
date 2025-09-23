import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AnalysisPanelStore {
  currentAnalysisId: string | null
  setCurrentAnalysisId: (id: string | null) => void
}

export const useAnalysisPanelStore = create<AnalysisPanelStore>()(
  persist(
    (set) => ({
      currentAnalysisId: null,
      setCurrentAnalysisId: (id) => set({ currentAnalysisId: id })
    }),
    {
      name: 'currentAnalysisId',
      partialize: (state) => ({ currentAnalysisId: state.currentAnalysisId })
    }
  )
)
