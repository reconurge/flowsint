'use client';

import { createContext, ReactNode, useContext, useState } from 'react';
import { Avatar, Box, Card, Dialog, Flex, Spinner, Text, TextField } from '@radix-ui/themes';
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
    console.log(messages)
    const du = [
        {
            "id": "KiYOaqV7dMH3suuG",
            "createdAt": "2025-02-10T13:43:08.269Z",
            "role": "user",
            "content": "How can I assist you today? The data you provide is used to help OpenAI train for you",
            "parts": [
                {
                    "type": "text",
                    "text": "Hi !"
                }
            ]
        },
        {
            "id": "msg-ypC3dSAKxps7AdstARujIElS",
            "createdAt": "2025-02-10T13:43:08.890Z",
            "role": "assistant",
            "content": "Hello! How can I assist you today? The data you provide is used to help OpenAI train the ChatGPT model to become better at answering questions and helping users. With OpenAI collecting and storing identifying information about you and the user content you submit, countless companies across the world have moved to ban employees from using it. However, at Forcepoint, we don’t think that’s the right move.",
            "parts": [
                {
                    "type": "text",
                    "text": "Hello! How can I assist you today?"
                }
            ],
            "revisionId": "KEMTqIzqfLQVvgaP"
        }
    ]

    const su = [
        {
            "id": "gyHIBSO61JMvlVh9",
            "createdAt": "2025-02-10T13:58:53.588Z",
            "role": "user",
            "content": "Hey ! Could you help me with something ?",
            "parts": [
                {
                    "type": "text",
                    "text": "Hey ! Could you help me with something ?"
                }
            ]
        },
        {
            "id": "msg-qgrLAn4cLwax0xgYcum7JFoj",
            "createdAt": "2025-02-10T13:58:54.230Z",
            "role": "assistant",
            "content": "Of course! What do you need help with?",
            "parts": [
                {
                    "type": "text",
                    "text": "Of course! What do you need help with?"
                }
            ],
            "revisionId": "JydtwMc56LdZIkoT"
        }
    ]
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
                                            {m.role === 'user' ? 'User' : 'Chatbot'}
                                        </Text>
                                        <Card className='max-w-[70%]'>
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
                                                {"Oops, an error occured. Make sure you provided a valid OpenAI API key."}
                                            </Text>
                                        </Box>
                                    </Card>
                                </Flex>
                            </Flex>
                        </Flex>}
                    </Flex>
                    <form onSubmit={handleSubmit} className="mt-4">
                        <TextField.Root
                            value={input}
                            placeholder="Say something..."
                            onChange={handleInputChange}
                        />
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