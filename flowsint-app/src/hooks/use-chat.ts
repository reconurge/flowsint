import { useEffect, useMemo, useRef } from 'react'
import { useChat as useAIChat } from '@ai-sdk/react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { chatCRUDService } from '@/api/chat-service'
import { createChatTransport } from '@/api/chat-transport'
import { useGraphStore } from '@/stores/graph-store'
import { useChatState } from '@/stores/use-chat-store'
import { useParams } from '@tanstack/react-router'
import { queryKeys } from '@/api/query-keys'
import { toUIMessage } from '@/types/chat'

export const useChat = () => {
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const currentChatId = useChatState((s) => s.currentChatId)
  const setCurrentChatId = useChatState((s) => s.setCurrentChatId)
  const deleteChat = useChatState((s) => s.deleteChat)
  const { investigationId } = useParams({ strict: false })
  const queryClient = useQueryClient()

  const transport = useMemo(
    () => (currentChatId ? createChatTransport(currentChatId) : undefined),
    [currentChatId]
  )

  // Fetch current chat data with messages
  const { data: currentChat, isLoading: isLoadingChat } = useQuery({
    queryKey: queryKeys.chats.detail(currentChatId!),
    queryFn: () => chatCRUDService.getById(currentChatId!),
    enabled: !!currentChatId,
    refetchOnWindowFocus: false,
  })

  // AI SDK useChat
  const {
    messages,
    status,
    sendMessage,
    stop,
    setMessages,
  } = useAIChat({
    id: currentChatId ?? undefined,
    transport,
    onFinish: () => {
      if (currentChatId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(currentChatId) })
      }
    },
    onError: (error) => {
      console.error('Chat error:', error)
      toast.error(
        'Failed to get AI response: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    },
  })

  // Sync server-loaded messages when switching chats
  const prevChatIdRef = useRef(currentChatId)
  useEffect(() => {
    if (currentChatId !== prevChatIdRef.current) {
      setMessages([])
      prevChatIdRef.current = currentChatId
    }
  }, [currentChatId, setMessages])

  useEffect(() => {
    if (currentChat?.messages?.length) {
      setMessages(currentChat.messages.map(toUIMessage))
    }
  }, [currentChat, setMessages])

  // Mutation to create a new chat
  const createChatMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description?: string }) => {
      const chatData = {
        title,
        description: description || '',
        investigation_id: investigationId,
      }
      return await chatCRUDService.create(JSON.stringify(chatData))
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.list })
      setCurrentChatId(data.id)
      toast.success('New chat created successfully!')
    },
    onError: (error) => {
      console.error('Error creating chat:', error)
      toast.error(
        'Failed to create chat: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    },
  })

  // Mutation to delete a chat
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      deleteChat(chatId)
      return await chatCRUDService.delete(chatId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.list })
      toast.success('Chat deleted successfully!')
    },
    onError: (error) => {
      console.error('Error deleting chat:', error)
      toast.error(
        'Failed to delete chat: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    },
  })

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    // Auto-create chat if none exists
    if (!currentChatId) {
      const chatTitle =
        selectedNodes.length > 0
          ? selectedNodes
              .map((node) => node.data.label)
              .join(', ')
              .slice(0, 100)
          : 'New Chat'

      try {
        const newChat = await createChatMutation.mutateAsync({
          title: chatTitle,
          description: 'Chat created from analysis',
        })
        if (!newChat?.id) return
        // sendMessage will fire once transport updates via the new currentChatId
        // but we need to wait for the next render, so we queue the send
        queuedMessageRef.current = text
      } catch (error) {
        console.error('Failed to create chat:', error)
      }
      return
    }

    sendMessage({ role: 'user', parts: [{ type: 'text', text }] })
  }

  // Handle queued message after chat creation
  const queuedMessageRef = useRef<string | null>(null)
  useEffect(() => {
    if (queuedMessageRef.current && currentChatId && transport) {
      const text = queuedMessageRef.current
      queuedMessageRef.current = null
      // Small delay to allow transport to settle
      setTimeout(() => {
        sendMessage({ role: 'user', parts: [{ type: 'text', text }] })
      }, 50)
    }
  }, [currentChatId, transport, sendMessage])

  const createNewChat = async (title?: string) => {
    const chatTitle =
      title ||
      (selectedNodes.length > 0
        ? selectedNodes[0].data.label
        : 'New Chat #' + (Math.floor(Math.random() * 900) + 1000))

    try {
      await createChatMutation.mutateAsync({
        title: chatTitle,
        description: 'Chat created from analysis',
      })
    } catch (error) {
      console.error('Failed to create new chat:', error)
    }
  }

  const deleteCurrentChat = async () => {
    if (!currentChatId) {
      toast.error('No chat to delete')
      return
    }
    try {
      await deleteChatMutation.mutateAsync(currentChatId)
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  }

  const switchToChat = (chatId: string) => {
    setCurrentChatId(chatId)
  }

  return {
    messages,
    status,
    sendMessage: handleSendMessage,
    stop,
    setMessages,
    currentChat,
    isLoadingChat,
    createNewChat,
    deleteCurrentChat,
    switchToChat,
    currentChatId,
    createChatMutation,
    deleteChatMutation,
  }
}
