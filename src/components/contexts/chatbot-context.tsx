"use client"

import type React from "react"
import { createContext, type ReactNode, useContext, useEffect, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "../ui/scroll-area"

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
        if (content)
            setInput(`What pattern can you extract from this person ?\n ${JSON.stringify(content)}`)
        setOpen(true)
    }

    return (
        <ChatContext.Provider value={{ open, handleOpenChat }}>
            {children}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className={cn("w-full p-4 flex divide-y flex-col justify-between", messages?.length > 0 ? "sm:max-w-[730px]" : "sm:max-w-[480px]")}>
                    <SheetHeader>
                        <SheetTitle>Ask AI</SheetTitle>
                        <SheetDescription>Ask AI chat bot to help you understand patterns.</SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="flex flex-col gap-3 overflow-y-auto w-full grow">
                        {messages.map((m) => (
                            <div key={m.id} className="flex grow mb-2">
                                <div
                                    className={cn(
                                        "flex gap-3 items-start w-full flex-row justify-start",
                                    )}
                                >
                                    <Avatar className={cn("h-8 w-8")}>
                                        <AvatarFallback>
                                            {m.role === "user" ? (
                                                <User className="h-4 w-4" />
                                            ) : (
                                                <Bot className="h-4 w-4" />
                                            )}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={cn("flex flex-col gap-1 w-full items-start")}>
                                        <Card className="bg-transparent shadow-none border-0">
                                            <CardContent className="p-0">
                                                <ReactMarkdown>{m.content}</ReactMarkdown>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {error && (
                            <div className="flex">
                                <div className="flex gap-1 items-start justify-start w-full">
                                    <Avatar className="h-8 w-8 bg-red-500">
                                        <AvatarFallback>
                                            <Bot className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col gap-1 items-start w-full">
                                        <span className="text-sm font-bold text-red-500">Error</span>
                                        <Card className="bg-transparent shadow-none border-0">
                                            <CardContent className="p-3 text-red-500">
                                                Oops, an error occurred. Make sure you provided a valid Mistral API key.
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                    <form onSubmit={handleSubmit} className=" flex items-center gap-2">
                        <Input
                            value={input}
                            onChange={handleInputChange}
                            placeholder="'What pattern can you extract from those relations ?'"
                            className="grow"
                        />
                        <div>
                            <Button type="submit">
                                Send
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
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

