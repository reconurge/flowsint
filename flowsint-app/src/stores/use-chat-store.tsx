import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatState {
  currentChatId: string | null
  setCurrentChatId: (chatId: string | null) => void
  deleteChat: (chatId: string) => void
}

export const useChatState = create<ChatState>()(
  persist(
    (set) => ({
      currentChatId: null,
      setCurrentChatId: (chatId) => set({ currentChatId: chatId }),
      deleteChat: (chatId) =>
        set((state) => ({
          currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
        })),
    }),
    {
      name: 'chat-state-storage',
      partialize: (state) => ({
        currentChatId: state.currentChatId,
      }),
    }
  )
)
