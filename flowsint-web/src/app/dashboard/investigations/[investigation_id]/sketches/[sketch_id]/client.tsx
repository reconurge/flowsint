"use client"
import { useQuery } from "@tanstack/react-query"
import { notFound } from "next/navigation"
import { shallow } from 'zustand/shallow'
// import ActionDialog from './actions'
import { Toolbar } from './toolbar'
import { LeftPanel } from './left-panel'
import { RightPanel } from './right-panel'
import { ResizablePanelGroup, ResizableHandle, ResizablePanel } from "@/components/ui/resizable"
import { useState } from "react"
import { useSketchStore } from "@/store/sketch-store"
import { GraphPanel } from "./graph-panel"
import { Sketch } from "@/types/sketch"
import SettingsModal from "./settings-modal"
import { CreateRelationDialog } from "@/components/sketches/sketch/create-relation"
import { clientFetch } from "@/lib/client-fetch"

interface DashboardClientProps {
    investigationId: string
    sketchId: string
    user_id: string,
    sketch: Sketch,
}
const stateSelector = (state: { currentNode: any; setCurrentNode: any }) => ({
    currentNode: state.currentNode,
    setCurrentNode: state.setCurrentNode,
})

export default function DashboardClient({ investigationId, sketchId, sketch, user_id }: DashboardClientProps) {
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)
    const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)

    const {
        currentNode,
    } = useSketchStore(stateSelector, shallow)

    const graphQuery = useQuery({
        queryKey: [process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API, "sketches", sketchId, "graph"],
        queryFn: async () => {
            const data = await clientFetch(`${process.env.NEXT_PUBLIC_FLOWSINT_API}/sketches/${sketchId}/graph`)
            return data
        },
        refetchOnWindowFocus: true,
    })

    return (
        <>
            <Toolbar investigation_id={investigationId} sketch_id={sketchId} sketch={sketch} user_id={user_id} />
            <div className="grow w-screen overflow-hidden relative">
                <ResizablePanelGroup autoSaveId="persistence" direction="horizontal" className="w-full h-full overflow-hidden relative">
                    {/* Left Panel - Entity Palette */}
                    <LeftPanel
                        isCollapsed={isLeftPanelCollapsed}
                        setIsCollapsed={setIsLeftPanelCollapsed}
                    />
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={65}>
                        <GraphPanel query={graphQuery} />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <RightPanel
                        sketchId={sketchId}
                        isLoading={graphQuery.isLoading}
                        isCollapsed={isRightPanelCollapsed}
                        setIsCollapsed={setIsRightPanelCollapsed}
                        currentNode={currentNode}
                    />
                </ResizablePanelGroup>
            </div>
            <CreateRelationDialog sketchId={sketchId} />
            <SettingsModal />
        </>
    )
}

