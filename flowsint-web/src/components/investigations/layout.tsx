"use client"
import React from 'react'
import MoreMenu from './more-menu';
import CaseSelector from './case-selector';
import NewCase from '@/components/dashboard/new-case';
import SearchModal from '@/components/dashboard/search-palette';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { PanelRightIcon, PlusIcon, RotateCwIcon } from 'lucide-react';
import Logo from '@/components/logo';
import { useInvestigationStore } from '@/store/investigation-store';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import Assistant from '../assistant';
import { AppSidebar } from '../app-sidebar';
import { SidebarProvider } from '../ui/sidebar';
import { ScanDrawer } from './scan-drawer';
import { ScanButton } from './scans-drawer/scan-button';

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
    const { panelOpen, setPanelOpen } = useInvestigationStore()
    return (
        <SidebarProvider defaultOpen={false}>
            <AppSidebar user={user} />
            <PanelGroup autoSaveId="conditional" className='h-screen w-screen flex' direction="horizontal">
                {panelOpen && <Panel id="left" order={1} className='h-screen' defaultSize={20} minSize={10}>
                    <div className='flex flex-col w-full h-full rounded-none shadow-none border-r'>
                        <div className='w-full rounded-none shadow-none h-12 border-b flex items-center gap-1 flex-row justify-end p-2'>
                            <div className='flex gap-1'>
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
                    </div>
                </Panel>}
                <PanelResizeHandle />
                <Panel id="right" order={2} defaultSize={90} minSize={50} className='grow flex flex-col'>
                    <div>
                        <div className='w-full rounded-none shadow-none h-12 justify-between border-b flex flex-row items-center'>
                            <div className='grow flex items-center justify-between p-2'>
                                <div className='flex gap-1 p-2'>
                                    <Button onClick={() => setPanelOpen(!panelOpen)} size="icon" variant="outline">
                                        <PanelRightIcon className='h-4 w-4' />
                                    </Button>
                                    <CaseSelector />
                                </div>
                                <MoreMenu />
                            </div>
                            <div className='border-l h-full flex items-center'>
                                <ScanButton />
                            </div>
                        </div>
                        {children}
                    </div>
                </Panel>
            </PanelGroup >
            <ScanDrawer />
        </SidebarProvider>
    )
}

export default InvestigationLayout