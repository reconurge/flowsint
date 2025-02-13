"use client"
import React from 'react'
import MoreMenu from './more-menu';
import CaseSelector from './case-selector';
import NewCase from '../dashboard/new-case';
import SearchModal from '../dashboard/seach-palette';
import { Flex, IconButton, ScrollArea } from '@radix-ui/themes';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { BotMessageSquareIcon, PanelRightIcon, PlusIcon } from 'lucide-react';
import { useChatContext } from '../contexts/chatbot-context';
import Logo from '../logo';
import { useInvestigationContext } from '../contexts/investigation-provider';
import User from '../user';

const InvestigationLayout = ({
    children,
    left,
    investigation_id,
    user
}: {
    children: React.ReactNode;
    left: React.ReactNode;
    investigation_id: string
    user: any
}) => {
    const { handleOpenChat } = useChatContext()
    const { panelOpen, setPanelOpen, investigation } = useInvestigationContext()
    return (
        <PanelGroup autoSaveId="conditional" className='h-screen w-screen flex' direction="horizontal">
            {panelOpen && <Panel id="left" className='h-screen' defaultSize={20} minSize={10}>
                <div className='flex flex-col w-full h-full rounded-none shadow-none border-r border-gray-400/20'>
                    <div className='w-full rounded-none shadow-none h-12 border-b border-gray-400/20 flex items-center gap-1 flex-row justify-between p-2'>
                        <Logo />
                        <Flex gap={"1"}>
                            <IconButton onClick={() => handleOpenChat(investigation)} color="gray" size="2" variant="soft"><BotMessageSquareIcon className="h-4" /></IconButton>
                            <SearchModal investigation_id={investigation_id} />
                            <NewCase>
                                <IconButton color="gray" size="2" variant="soft">
                                    <PlusIcon className="h-5" />
                                </IconButton>
                            </NewCase>
                        </Flex>
                    </div>
                    <ScrollArea type="auto" scrollbars="vertical" className='p-3 h-full grow overflow-y-auto'>
                        <div className="flex flex-col">
                            {left}
                        </div>
                    </ScrollArea>
                    <Flex justify={"end"} className='p-2'>
                        <User user={user} />
                    </Flex>
                </div>
            </Panel>}
            <PanelResizeHandle />
            <Panel id="center" defaultSize={80} minSize={50} className='grow flex flex-col'>
                <div>
                    <div className='w-full rounded-none shadow-none h-12 justify-between border-b border-gray-400/20 flex flex-row items-center p-2'>
                        <Flex gap={"1"}>
                            <IconButton onClick={() => setPanelOpen(!panelOpen)} variant='soft' color='gray'>
                                <PanelRightIcon className='h-4 w-4' />
                            </IconButton>
                            <CaseSelector />
                        </Flex>
                        <MoreMenu />
                    </div>
                    {children}
                </div>
            </Panel>
        </PanelGroup>
    )
}

export default InvestigationLayout