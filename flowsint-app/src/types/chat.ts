import type { UIMessage } from 'ai'

export interface ChatMessage {
  id: string
  content: string
  is_bot: boolean
  created_at: string
  context?: any
  chatId?: string
}

export type ChatContextFormat = {
  fromType: string
  fromLabel: string
  fromColor: string | null
  toType: string
  toLabel: string
  toColor: string | null
  label: string
}

export interface Chat {
  id: string
  title: string
  description: string
  created_at: string
  last_updated_at: string
}

export function toUIMessage(msg: ChatMessage): UIMessage {
  return {
    id: msg.id,
    role: msg.is_bot ? 'assistant' : 'user',
    parts: [{ type: 'text', text: msg.content }]
  }
}
