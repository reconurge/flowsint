'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Avatar, Box, Card, Dialog, Flex, Spinner, Text, TextArea, TextField } from '@radix-ui/themes';
import { useChat } from '@ai-sdk/react';
import { BotIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import ReactMarkdown from 'react-markdown'


interface ChatContextType {
    open: boolean,
    setOpen: any
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
    children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
    const [open, setOpen] = useState(false);
    const { messages, input, handleInputChange, handleSubmit, error, isLoading } = useChat();

    return (
        <ChatContext.Provider value={{ open, setOpen }}>
            {children}
            <Dialog.Root open={open} onOpenChange={setOpen}>
                <Dialog.Content maxWidth={messages?.length > 0 ? "630px" : '480px'} className="w-full p-4">
                    <Dialog.Title>Ask AI</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Ask AI chat bot to help you understant patterns.</Dialog.Description>
                    <Flex direction={"column"} gap="3" className=" overflow-y-auto w-full">
                        {messages.map(m => (
                            <Flex key={m.id} className='grow'>
                                <Flex gap="1" align="start" justify={m.role === 'user' ? "end" : "start"} direction={m.role === 'user' ? "row-reverse" : "row"} className='w-full'>
                                    <Avatar
                                        size="3"
                                        color={m.role === 'user' ? 'blue' : 'orange'}
                                        radius="full"
                                        fallback={m.role === 'user' ? 'U' : isLoading ? <Spinner /> : <BotIcon className='h-4' />}
                                    />
                                    <Flex direction={"column"} align={m.role === 'user' ? 'end' : 'start'} gap="1" className='w-full'>
                                        <Text size="2" as='div' weight="bold" className={cn(m.role === 'user' ? 'text-right' : 'text-left')}>
                                            {isLoading ? <LoadingDots /> : m.role === 'user' ? 'User' : 'Chatbot'}
                                        </Text>
                                        <Card className='max-w-[80%]'>
                                            <Box>
                                                <Text as="div" size="2" color="gray">
                                                    <ReactMarkdown>{m.content}</ReactMarkdown>
                                                </Text>
                                            </Box>
                                        </Card>
                                    </Flex>
                                </Flex>
                            </Flex>
                        ))}
                        {error && <Flex className='grow'>
                            <Flex gap="1" align="start" justify={"start"} direction={"row"} className='w-full'>
                                <Avatar
                                    size="3"
                                    color={'red'}
                                    radius="full"
                                    fallback={<BotIcon className='h-4' />}
                                />
                                <Flex direction={"column"} align={'start'} gap="1" className='w-full'>
                                    <Text size="2" as='div' weight="bold" color='red' className={cn('text-left')}>
                                        {'Error'}
                                    </Text>
                                    <Card className='max-w-[70%]'>
                                        <Box>
                                            <Text as="div" size="2" color="red">
                                                {"Oops, an error occured. Make sure you provided a valid Mistral API key."}
                                            </Text>
                                        </Box>
                                    </Card>
                                </Flex>
                            </Flex>
                        </Flex>}
                    </Flex>
                    <form onSubmit={handleSubmit} className="mt-4">
                        <Box width={"100%"}>
                            <TextField.Root value={input}
                                onChange={handleInputChange}
                                size="2" placeholder="'What pattern can you extract from those relations ?'" />
                        </Box>
                    </form>
                </Dialog.Content>
            </Dialog.Root>
        </ChatContext.Provider>
    );
}

export const useChatContext = (): ChatContextType => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChatContext must be used within a ChatProvider");
    }
    return context;
};

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