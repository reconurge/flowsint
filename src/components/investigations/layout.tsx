"use client"
import { Investigation } from '@/src/types/investigation';
import React from 'react'
import { ThemeSwitch } from '../theme-switch';
import MoreMenu from './more-menu';
import CaseSelector from './case-selector';
import NewCase from '../dashboard/new-case';
import SearchModal from '../dashboard/seach-palette';
import { IconButton, ScrollArea } from '@radix-ui/themes';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { BotMessageSquareIcon } from 'lucide-react';
import { useChatContext } from '../contexts/chatbot-context';

const InvestigationLayout = ({
    children,
    left,
    investigation_id
}: {
    children: React.ReactNode;
    left: React.ReactNode;
    investigation_id: string
}) => {
    const { setOpen: setOpenChat } = useChatContext()
    return (
        <PanelGroup className='h-screen w-screen flex' direction="horizontal">
            <Panel className='h-screen' defaultSize={20} minSize={20}>
                <div className='flex flex-col w-full h-full rounded-none shadow-none border-r border-gray-400/20'>
                    <div className='w-full rounded-none shadow-none h-12 border-b border-gray-400/20 flex items-center gap-1 flex-row justify-end p-2'>
                        <IconButton onClick={() => setOpenChat(true)} color="gray" size="2" variant="soft"><BotMessageSquareIcon className="h-4" /></IconButton>
                        <SearchModal investigation_id={investigation_id} />
                        <NewCase />
                    </div>
                    <ScrollArea type="auto" scrollbars="vertical" className='p-3 h-full grow overflow-y-auto'>
                        <div className="flex flex-col">
                            {left}
                        </div>
                    </ScrollArea>

                </div>
            </Panel>
            <PanelResizeHandle />
            <Panel defaultSize={80} minSize={50} className='grow flex flex-col'>
                <div>
                    <div className='w-full rounded-none shadow-none h-12 justify-between border-b border-gray-400/20 flex flex-row items-center p-2'>
                        <CaseSelector />
                        <MoreMenu />
                    </div>
                    {children}
                </div>
            </Panel>
        </PanelGroup>

    )
}

export default InvestigationLayout