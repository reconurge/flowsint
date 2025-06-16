import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;

export interface ChatResponse {
    content: string
}

export class ChatService {
    private static instance: ChatService
    private baseUrl: string

    private constructor() {
        this.baseUrl = `${API_URL}/api/chat`
    }

    public static getInstance(): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService()
        }
        return ChatService.instance
    }

    async streamChat(prompt: string, onChunk: (content: string) => void, context?: any): Promise<string> {
        const response = await fetch(`${this.baseUrl}/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                prompt,
                context 
            }),
        })

        if (!response.ok) {
            console.error("Response not OK:", response.status, response.statusText)
            throw new Error('Failed to get AI completion')
        }

        const reader = response.body?.getReader()
        if (!reader) {
            console.error("No reader available")
            throw new Error('No reader available')
        }

        let accumulatedContent = ''

        while (true) {
            const { done, value } = await reader.read()
            if (done) {
                console.log("Stream complete")
                break
            }

            const text = new TextDecoder().decode(value)
            const lines = text.split('\n')

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6)
                    if (data === '[DONE]') {
                        return accumulatedContent
                    }
                    try {
                        const parsed = JSON.parse(data)
                        if (parsed.content) {
                            accumulatedContent += parsed.content
                            onChunk(accumulatedContent)
                        }
                    } catch (e) {
                        toast.error("Error parsing SSE data.")
                    }
                }
            }
        }

        return accumulatedContent
    }
}

export const chatService = ChatService.getInstance() 