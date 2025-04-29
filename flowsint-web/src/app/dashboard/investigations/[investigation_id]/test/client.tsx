"use client"

import React, { useState } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useFlowStore } from '@/store/flow-store'
import { shallow } from 'zustand/shallow'
import ActionDialog from './actions'
import { Toolbar } from './toolbar'
import { LeftPanel } from './left-panel'
import { GraphPanel } from './graph-panel'
import { RightPanel } from './right-panel'
import { useQueryState } from 'nuqs'
import { useQuery } from '@tanstack/react-query'

const Client = () => {
    const [open, setOpen] = useState(false)
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)
    const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)
    const [activeTab, setActiveTab] = useQueryState("graph1")

    const stateSelector = (state: { currentNode: any; setCurrentNode: any }) => ({
        currentNode: state.currentNode,
        setCurrentNode: state.setCurrentNode,
    })

    const {
        currentNode,
        setCurrentNode
    } = useFlowStore(stateSelector, shallow)


    const query = useQuery({
        queryKey: ["sketch", "sketch", activeTab],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/sketch/nodes`)
            if (!res.ok || res.status === 404) {
                throw Error()
            }
            return res.json()
        },
        refetchOnWindowFocus: true,
    })

    return (
        <>
            <Toolbar />
            {/* Main Content */}
            <div className="grow w-screen relative">
                <ResizablePanelGroup autoSaveId="persistence" direction="horizontal" className="w-full h-full relative overflow-hidden">
                    {/* Left Panel - Entity Palette */}
                    <LeftPanel
                        isCollapsed={isLeftPanelCollapsed}
                        setIsCollapsed={setIsLeftPanelCollapsed}
                    />

                    <ResizableHandle withHandle />

                    {/* Center Panel with Tabs and Graph */}
                    <ResizablePanel defaultSize={65}>
                        <GraphPanel
                            activeTab={activeTab as string}
                            setActiveTab={setActiveTab}
                            currentNode={currentNode}
                            setCurrentNode={setCurrentNode}
                            setOpenDialog={setOpen}
                            query={query}
                        />
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Right Panel */}
                    <RightPanel
                        isCollapsed={isRightPanelCollapsed}
                        setIsCollapsed={setIsRightPanelCollapsed}
                        currentNode={currentNode}
                    />
                </ResizablePanelGroup>

                <ActionDialog setCurrentNode={setCurrentNode} setOpenDialog={setOpen} openDialog={open} />
            </div>
        </>
    )
}

export default Client