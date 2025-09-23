import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CardType =
  | 'description'
  | 'core-properties'
  | 'additional-properties'
  | 'preview'
  | 'neighbors'
  | 'location'

interface CardState {
  id: CardType
  isEditing: boolean
  order: number
}

interface NodeEditorLayoutState {
  cardLayout: CardState[]
  setCardLayout: (layout: CardState[]) => void
  toggleCardEdit: (cardId: CardType) => void
  setCardEditState: (cardId: CardType, isEditing: boolean) => void
  resetLayout: () => void
}

const defaultCardLayout: CardState[] = [
  { id: 'description', isEditing: false, order: 0 },
  { id: 'core-properties', isEditing: false, order: 1 },
  { id: 'additional-properties', isEditing: false, order: 2 },
  { id: 'preview', isEditing: false, order: 3 },
  { id: 'neighbors', isEditing: false, order: 4 },
  { id: 'location', isEditing: false, order: 5 }
]

export const useNodeEditorLayoutStore = create<NodeEditorLayoutState>()(
  persist(
    (set, get) => ({
      cardLayout: defaultCardLayout,
      setCardLayout: (layout) => set({ cardLayout: layout }),
      toggleCardEdit: (cardId) => {
        const { cardLayout } = get()
        const updatedLayout = cardLayout.map((card) =>
          card.id === cardId ? { ...card, isEditing: !card.isEditing } : card
        )
        set({ cardLayout: updatedLayout })
      },
      setCardEditState: (cardId, isEditing) => {
        const { cardLayout } = get()
        const updatedLayout = cardLayout.map((card) =>
          card.id === cardId ? { ...card, isEditing } : card
        )
        set({ cardLayout: updatedLayout })
      },
      resetLayout: () => set({ cardLayout: defaultCardLayout })
    }),
    {
      name: 'node-editor-layout-storage',
      partialize: (state) => ({ cardLayout: state.cardLayout })
    }
  )
)
