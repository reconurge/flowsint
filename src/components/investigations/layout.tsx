"use client"
import React from 'react'
import MoreMenu from './more-menu';
import CaseSelector from './case-selector';
import NewCase from '@/components/dashboard/new-case';
import SearchModal from '@/components/dashboard/search-palette';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { BotMessageSquareIcon, PanelRightIcon, PlusIcon } from 'lucide-react';
import { useChatContext } from '@/components/contexts/chatbot-context';
import Logo from '@/components/logo';
import { useInvestigationContext } from '@/components/contexts/investigation-provider';
import { NavUser } from '@/components/user';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

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
            {panelOpen && <Panel id="left" order={1} className='h-screen' defaultSize={20} minSize={15}>
                <div className='flex flex-col w-full h-full rounded-none shadow-none border-r'>
                    <div className='w-full rounded-none shadow-none h-12 border-b flex items-center gap-1 flex-row justify-between p-2'>
                        <Logo />
                        <div className='flex gap-1'>
                            <Button variant="outline" size="icon" onClick={() => handleOpenChat(investigation)} color="gray"><BotMessageSquareIcon className="h-4" /></Button>
                            <SearchModal investigation_id={investigation_id} />
                            <NewCase>
                                <Button variant="outline" size="icon">
                                    <PlusIcon className="h-5" />
                                </Button>
                            </NewCase>
                        </div>
                    </div>
                    <ScrollArea type="auto" className='h-full grow overflow-y-auto'>
                        <div className="flex flex-col">
                            {left}
                        </div>
                    </ScrollArea>
                    <div className="flex justify-end p-2">
                        <NavUser user={user} />
                    </div>
                </div>
            </Panel>}
            <PanelResizeHandle />
            <Panel id="right" order={2} defaultSize={80} minSize={50} className='grow flex flex-col'>
                <div>
                    <div className='w-full rounded-none shadow-none h-12 justify-between border-b flex flex-row items-center p-2'>
                        <div className='flex gap-1'>
                            <Button onClick={() => setPanelOpen(!panelOpen)} size="icon" variant="outline">
                                <PanelRightIcon className='h-4 w-4' />
                            </Button>
                            <CaseSelector />
                        </div>
                        <MoreMenu />
                    </div>
                    {children}
                </div>
            </Panel>
        </PanelGroup >
    )
}

export default InvestigationLayout