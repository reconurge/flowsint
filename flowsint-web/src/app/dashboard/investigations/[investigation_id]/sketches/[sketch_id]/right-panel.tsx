import { Button } from '@/components/ui/button'
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import NodesPanel from '@/components/sketches/sketch/nodes-panel'
import ProfilePanel from '@/components/sketches/sketch/profile-panel'
import { memo, useMemo, useRef } from 'react'
import { useSketchStore } from '@/store/sketch-store'
import { shallow } from 'zustand/shallow'
import { MiniMap } from '@xyflow/react'

interface RightPanelProps {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
    currentNode: any,
    isLoading: boolean
    sketchId: string
    minimapRef: any
}

export const RightPanel = memo(function RightPanel({ isCollapsed, isLoading, setIsCollapsed, currentNode, sketchId, minimapRef }: RightPanelProps) {
    const stateSelector = (state: { nodes: any }) => ({
        nodes: state.nodes,
    })
    const {
        nodes,
    } = useSketchStore(stateSelector, shallow)
    const processedNodes = useMemo(() =>
        nodes.map((node: any) => (node))
            .sort((a: { type?: any }, b: { type?: string }) => b?.type?.localeCompare(a?.type || "")),
        [nodes.length]
    );

    return (
        <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={40}
            className="h-full bg-card"
            collapsible={true}
            collapsedSize={2}
            onCollapse={() => setIsCollapsed(true)}
            onExpand={() => setIsCollapsed(false)}
        >
            {!isCollapsed ? (
                <ResizablePanelGroup autoSaveId="conditional" direction="vertical">
                    <ResizablePanel order={1} id="map" defaultSize={30} className='flex bg-background items-center justfify-center p-4 overflow-hidden'>
                        <div className='w-full h-full overflow-hidden z-[50]' ref={minimapRef} />
                    </ResizablePanel>

                    {currentNode ? (
                        <>
                            <ResizableHandle withHandle className='z-[11]' />
                            <ResizablePanel order={2} id="infos" defaultSize={30}>
                                <ProfilePanel sketch_id={sketchId} data={currentNode.data} />
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                        </>
                    ) : (
                        <ResizableHandle withHandle />
                    )}

                    <ResizablePanel order={3} id="nodes" defaultSize={40}>
                        <NodesPanel isLoading={isLoading} nodes={processedNodes} />
                    </ResizablePanel>
                </ResizablePanelGroup>
            ) : (
                <div className="flex h-full items-center justify-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsCollapsed(false)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </ResizablePanel>
    )
})