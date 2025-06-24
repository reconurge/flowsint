import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { chatService } from '@/api/chat.service'
import { marked } from 'marked';
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
import { useGraphStore } from '@/stores/graph-store';

const markdownToHtml = (markdown: string) => {
    return marked(markdown, {
        breaks: true,    // Convert \n to <br>
        gfm: true,       // Enable GitHub Flavored Markdown
        async: false
    });
};

interface UseChatOptions {
    onContentUpdate: (content: any) => void
    onSuccess?: () => void
    editor?: Editor
}

export const useChat = ({ onContentUpdate, onSuccess, editor }: UseChatOptions) => {
    const [isAiLoading, setIsAiLoading] = useState(false)
    const [promptOpen, setPromptOpen] = useState(true)
    const [customPrompt, setCustomPrompt] = useState("")
    const selectedNodes = useGraphStore(s => s.selectedNodes)

    const aiCompletionMutation = useMutation({
        mutationFn: async (prompt: string) => {
            setIsAiLoading(true)
            try {
                return await chatService.streamChat(prompt, (content) => {
                    const htmlContent = markdownToHtml(content);
                    const extensions = [
                        StarterKit.configure({
                            horizontalRule: false,
                            codeBlock: false,
                            paragraph: { HTMLAttributes: { class: "text-node" } },
                            heading: { HTMLAttributes: { class: "heading-node" } },
                            blockquote: { HTMLAttributes: { class: "block-node" } },
                            bulletList: { HTMLAttributes: { class: "list-node" } },
                            orderedList: { HTMLAttributes: { class: "list-node" } },
                            code: { HTMLAttributes: { class: "inline", spellcheck: "false" } },
                            dropcursor: { width: 2, class: "ProseMirror-dropcursor border" },
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
                        onContentUpdate(jsonContent)
                    }
                })
            } catch (error) {
                console.error("Error in chat stream:", error)
                throw error
            } finally {
                setIsAiLoading(false)
            }
        },
        onSuccess: () => {
            onSuccess?.()
            // toast.success("AI completion added!")
        },
        onError: (error) => {
            console.error("Chat error:", error)
            toast.error("Failed to get AI completion: " + (error instanceof Error ? error.message : "Unknown error"))
        }
    })

    const handleCustomPrompt = async (currentContent: any) => {
        if (!customPrompt.trim()) {
            toast.error("Please enter a prompt")
            return
        }
        const content = typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent)
        const nodeLabel = selectedNodes.map(node => node.data.label).join(", ")
        const context = selectedNodes ? `${nodeLabel}\n\nContext:\n${content}` : content
        const fullPrompt = `${customPrompt}\n\nContext:\n${context}`
        setPromptOpen(false)
        setCustomPrompt("")
        aiCompletionMutation.mutate(fullPrompt)
    }

    return {
        isAiLoading,
        promptOpen,
        setPromptOpen,
        customPrompt,
        setCustomPrompt,
        handleCustomPrompt
    }
} 