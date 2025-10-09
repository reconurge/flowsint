import { ChatMessage } from '@/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatState {
  currentChatId: string | null
  setCurrentChatId: (chatId: string | null) => void
  messages: ChatMessage[]
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  deleteChat: (chatId: string) => void
}

export const useChatState = create<ChatState>()(
  persist(
    (set, _) => ({
      currentChatId: null,
      messages: [],
      setCurrentChatId: (chatId) => set({ currentChatId: chatId }),
      setMessages: (messages) => set({ messages: messages }),
      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            { ...message, chatId: message.chatId || state.currentChatId || undefined }
          ]
        })),
      deleteChat: (chatId) =>
        set((state) => ({
          currentChatId: state.currentChatId === chatId ? null : state.currentChatId
        }))
    }),
    {
      name: 'chat-state-storage',
      partialize: (state) => ({
        currentChatId: state.currentChatId
      })
    }
  )
)
