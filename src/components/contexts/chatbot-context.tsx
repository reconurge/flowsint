"use client"

import type React from "react"
import { createContext, type ReactNode, useContext, useEffect, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface ChatContextType {
  open: boolean
  handleOpenChat: (content: any) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

interface ChatProviderProps {
  children: ReactNode
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [open, setOpen] = useState(false)
  const [context, setContext] = useState<any>(null)
  const { messages, input, handleInputChange, setInput, handleSubmit, error, isLoading } = useChat()

  const handleOpenChat = (content: any) => {
    setContext(content)
    setInput(`What pattern can you extract from this person ?\n ${JSON.stringify(content)}`)
    setOpen(true)
  }

  return (
    <ChatContext.Provider value={{ open, handleOpenChat }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn("w-full p-4", messages?.length > 0 ? "sm:max-w-[730px]" : "sm:max-w-[480px]")}>
          <DialogHeader>
            <DialogTitle>Ask AI</DialogTitle>
            <DialogDescription>Ask AI chat bot to help you understand patterns.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 overflow-y-auto w-full max-h-[60vh]">
            {messages.map((m) => (
              <div key={m.id} className="flex grow">
                <div
                  className={cn(
                    "flex gap-1 items-start w-full",
                    m.role === "user" ? "flex-row-reverse justify-end" : "flex-row justify-start",
                  )}
                >
                  <Avatar className={cn("h-8 w-8", m.role === "user" ? "bg-blue-500" : "bg-orange-500")}>
                    <AvatarFallback>
                      {m.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : isLoading ? (
                        <LoadingDots />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("flex flex-col gap-1 w-full", m.role === "user" ? "items-end" : "items-start")}>
                    <span className={cn("text-sm font-bold", m.role === "user" ? "text-right" : "text-left")}>
                      {isLoading && m.role !== "user" ? <LoadingDots /> : m.role === "user" ? "User" : "Chatbot"}
                    </span>
                    <Card className="max-w-[80%]">
                      <CardContent className="p-3">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            ))}
            {error && (
              <div className="flex grow">
                <div className="flex gap-1 items-start justify-start w-full">
                  <Avatar className="h-8 w-8 bg-red-500">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1 items-start w-full">
                    <span className="text-sm font-bold text-red-500">Error</span>
                    <Card className="max-w-[80%]">
                      <CardContent className="p-3 text-red-500">
                        Oops, an error occurred. Make sure you provided a valid Mistral API key.
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="mt-4">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="'What pattern can you extract from those relations ?'"
              className="w-full"
            />
            <Button type="submit" className="mt-2">
              Send
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </ChatContext.Provider>
  )
}

export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider")
  }
  return context
}

interface LoadingDotsProps {
  speed?: number
  text?: string
}

const LoadingDots: React.FC<LoadingDotsProps> = ({ speed = 200, text = "Thinking" }) => {
  const [dots, setDots] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prevDots) => {
        if (prevDots.length >= 3) {
          return ""
        }
        return prevDots + "."
      })
    }, speed)

    return () => clearInterval(interval)
  }, [speed])

  return (
    <div className="flex items-center">
      <span>{text}</span>
      <span className="w-8 text-left">{dots}</span>
    </div>
  )
}

