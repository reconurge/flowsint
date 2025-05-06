import { Button } from '@/components/ui/button'
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import NodesPanel from '@/components/sketches/sketch/nodes-panel'
import ProfilePanel from '@/components/sketches/sketch/profile-panel'
import { memo, useMemo } from 'react'
import { useFlowStore } from '@/store/flow-store'
import { shallow } from 'zustand/shallow'
import { MiniMap } from '@xyflow/react'

interface RightPanelProps {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
    currentNode: any,
    isLoading: boolean
    sketchId: string
}

export const RightPanel = memo(function RightPanel({ isCollapsed, isLoading, setIsCollapsed, currentNode, sketchId }: RightPanelProps) {
    const stateSelector = (state: { nodes: any }) => ({
        nodes: state.nodes,
    })

    const {
        nodes,
    } = useFlowStore(stateSelector, shallow)

    const processedNodes = useMemo(() =>
        nodes.map(({ id, data, type }: { id: string; data: any; type: string }) => ({ id, data, type }))
            .sort((a: { type: any }, b: { type: string }) => b.type?.localeCompare(a.type || "")),
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
                    {/* <ResizablePanel order={1} id="map" defaultSize={30} className='flex items-center justfify-center'>
                        <div className='relative grow'>
                            <MiniMap pannable className='mx-auto' />
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle /> */}

                    {currentNode && (
                        <>
                            <ResizablePanel order={1} id="infos" defaultSize={30}>
                                <ProfilePanel sketch_id={sketchId} data={currentNode.data} />
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                        </>
                    )}
                    <ResizablePanel order={2} id="nodes" defaultSize={40}>
                        <div className="flex h-8 items-center justify-between border-b px-4 bg-card">
                            <h2 className="font-medium text-sm">Entities</h2>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>
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