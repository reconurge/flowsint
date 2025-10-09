import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { chatService, chatCRUDService } from '@/api/chat-service'
import { marked } from 'marked'
import { generateJSON } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import { Typography } from '@tiptap/extension-typography'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Color } from '@tiptap/extension-color'
import type { Editor } from '@tiptap/react'
import { useGraphStore } from '@/stores/graph-store'
import { useChatState } from '@/stores/use-chat-store'
import { useParams } from '@tanstack/react-router'
import { queryKeys } from '@/api/query-keys'

const markdownToHtml = (markdown: string) => {
  return marked(markdown, {
    breaks: true, // Convert \n to <br>
    gfm: true, // Enable GitHub Flavored Markdown
    async: false
  })
}

interface UseChatOptions {
  onContentUpdate: (content: any) => void
  onSuccess?: () => void
  editor?: Editor
}

export const useChat = ({ onContentUpdate, onSuccess, editor }: UseChatOptions) => {
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const currentChatId = useChatState((s) => s.currentChatId)
  const setCurrentChatId = useChatState((s) => s.setCurrentChatId)
  const deleteChat = useChatState((s) => s.deleteChat)
  const addMessage = useChatState((s) => s.addMessage)
  const { investigationId } = useParams({ strict: false })
  const queryClient = useQueryClient()

  // Fetch current chat data with messages
  const { data: currentChat, isLoading: isLoadingChat } = useQuery({
    queryKey: queryKeys.chats.detail(currentChatId!),
    queryFn: () => chatCRUDService.getById(currentChatId!),
    enabled: !!currentChatId,
    refetchOnWindowFocus: false
  })

  // Mutation to create a new chat
  const createChatMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description?: string }) => {
      const chatData = {
        title,
        description: description || '',
        investigation_id: investigationId
      }
      return await chatCRUDService.create(JSON.stringify(chatData))
    },
    onSuccess: (data) => {
      // Add the new chat to the store
      // Invalidate chats query to refresh the list
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(currentChatId!) })
      setCurrentChatId(data.id)
      toast.success('New chat created successfully!')
    },
    onError: (error) => {
      console.error('Error creating chat:', error)
      toast.error(
        'Failed to create chat: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  // Mutation to delete a chat
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      deleteChat(chatId)
      return await chatCRUDService.delete(chatId)
    },
    onSuccess: () => {
      // Remove the chat from the store
      // Invalidate chats query to refresh the list
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.list })
      toast.success('Chat deleted successfully!')
    },
    onError: (error) => {
      console.error('Error deleting chat:', error)
      toast.error(
        'Failed to delete chat: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  const aiCompletionMutation = useMutation({
    mutationFn: async ({ chatId, prompt }: { chatId: string; prompt: string }) => {
      setIsAiLoading(true)
      try {
        return await chatService.streamChat(
          chatId,
          prompt,
          (content) => {
            const htmlContent = markdownToHtml(content)
            const extensions = [
              StarterKit.configure({
                horizontalRule: false,
                codeBlock: false,
                paragraph: { HTMLAttributes: { class: 'text-node' } },
                heading: { HTMLAttributes: { class: 'heading-node' } },
                blockquote: { HTMLAttributes: { class: 'block-node' } },
                bulletList: { HTMLAttributes: { class: 'list-node' } },
                orderedList: { HTMLAttributes: { class: 'list-node' } },
                code: { HTMLAttributes: { class: 'inline', spellcheck: 'false' } },
                dropcursor: { width: 2, class: 'ProseMirror-dropcursor border' }
              }),
              Link,
              Underline,
              Image,
              Color,
              TextStyle,
              HorizontalRule,
              CodeBlockLowlight,
              Typography,
              Placeholder.configure({ placeholder: 'Enter your analysis...' })
            ]
            const jsonContent = generateJSON(htmlContent, extensions)

            if (editor) {
              // If we have an editor instance, use its commands
              editor.commands.setContent(jsonContent)
              onContentUpdate(jsonContent)
            } else {
              // Otherwise, use the callback
              onContentUpdate(content)
            }
          },
          selectedNodes
        )
      } catch (error) {
        console.error('Error in chat stream:', error)
        throw error
      } finally {
        setIsAiLoading(false)
      }
    },
    onSuccess: () => {
      onSuccess?.()
      // Invalidate the current chat query to refresh messages
      if (currentChatId) {
        onContentUpdate('')
        queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(currentChatId) })
      }
    },
    onError: (error) => {
      console.error('Chat error:', error)
      toast.error(
        'Failed to get AI completion: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  const handleCustomPrompt = async () => {
    // Case where no chat is created - create a new chat first
    if (!currentChatId) {
      const chatTitle =
        selectedNodes.length > 0
          ? `${selectedNodes
              .map((node) => node.data.label)
              .join(', ')
              .slice(0, 100)}`
          : 'New Chat'

      try {
        const newChat = await createChatMutation.mutateAsync({
          title: chatTitle,
          description: 'Chat created from analysis'
        })
        // After creating the chat, proceed with the prompt
        if (newChat?.id) {
          await handlePromptWithChat(newChat.id)
        }
      } catch (error) {
        console.error('Failed to create chat:', error)
        return
      }
    } else {
      addMessage({
        content: customPrompt.trim(),
        context: selectedNodes.map((node) => node.data.label),
        is_bot: false,
        id: new Date().getTime().toString(),
        created_at: new Date().toISOString(),
        chatId: currentChatId
      })
      await handlePromptWithChat(currentChatId)
    }
  }

  const handlePromptWithChat = async (chatId: string) => {
    if (!customPrompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }
    const fullPrompt = `${customPrompt}`
    setCustomPrompt('')
    aiCompletionMutation.mutate({ chatId, prompt: fullPrompt })
  }

  const createNewChat = async (title?: string) => {
    const chatTitle =
      title ||
      (selectedNodes.length > 0
        ? `${selectedNodes[0].data.label}`
        : 'New Chat #' + Math.floor(Math.random() * 900) + 1000)

    try {
      await createChatMutation.mutateAsync({
        title: chatTitle,
        description: 'Chat created from analysis'
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
    isAiLoading,
    customPrompt,
    setCustomPrompt,
    handleCustomPrompt,
    createChatMutation,
    deleteChatMutation,
    currentChat,
    isLoadingChat,
    createNewChat,
    deleteCurrentChat,
    switchToChat,
    currentChatId
  }
}
