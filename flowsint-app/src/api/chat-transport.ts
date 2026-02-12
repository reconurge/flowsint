import { DefaultChatTransport } from 'ai'
import { useAuthStore } from '@/stores/auth-store'

const API_URL = import.meta.env.VITE_API_URL

export function createChatTransport(chatId: string) {
  return new DefaultChatTransport({
    api: `${API_URL}/api/chats/stream/${chatId}`,
    headers: (): Record<string, string> => {
      const token = useAuthStore.getState().token
      if (token) return { Authorization: `Bearer ${token}` }
      return {}
    },
    prepareSendMessagesRequest: ({ messages, body }) => {
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
      const prompt = lastUserMessage?.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? ''

      const context = (body as Record<string, unknown> | undefined)?.context
      return {
        body: { prompt, ...(context ? { context } : {}) },
      }
    },
  })
}
