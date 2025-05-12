import { Button } from '@/components/ui/button'
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable'
import { ChevronDown, ChevronLeft, InfoIcon } from 'lucide-react'
import NodesPanel from '@/components/sketches/sketch/nodes-panel'
import ProfilePanel from '@/components/sketches/sketch/profile-panel'
import { memo, useMemo, useRef } from 'react'
import { useSketchStore } from '@/store/sketch-store'
import { shallow } from 'zustand/shallow'
import { MiniMap } from '@xyflow/react'
import { NodeData } from '@/types'

interface RightPanelProps {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
    currentNode: any,
    isLoading: boolean
    sketchId: string
}

export const RightPanel = memo(function RightPanel({ isCollapsed, isLoading, setIsCollapsed, currentNode, sketchId }: RightPanelProps) {
    const stateSelector = (state: { nodes: any, selectedNodes: any, clearSelectedNodes: any }) => ({
        nodes: state.nodes,
        selectedNodes: state.selectedNodes,
        clearSelectedNodes: state.clearSelectedNodes
    })
    const {
        nodes,
        selectedNodes,
        clearSelectedNodes
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
            collapsedSize={1}
            onCollapse={() => setIsCollapsed(true)}
            onExpand={() => setIsCollapsed(false)}
        >
            {!isCollapsed ? (
                <ResizablePanelGroup autoSaveId="conditional" direction="vertical">
                    {selectedNodes.length > 0 &&
                        <>
                            <ResizablePanel order={1} id="map" defaultSize={30}>
                                <div className="overflow-y-auto overflow-x-hidden h-full p-4">
                                    <h3 className="text-sm font-semibold mb-2 flex items-center">
                                        <InfoIcon className="mr-2" size={16} />
                                        {selectedNodes.length === 1 ? 'Selected Node' : `${selectedNodes.length} nodes selected`}
                                    </h3>
                                    {selectedNodes.map((node: NodeData) => (
                                        <div key={node.id} className="mb-2 pb-2 border-b last:border-0">
                                            <p>label: <strong className='text-sm'>{node.label}</strong></p>
                                        </div>
                                    ))}
                                    <Button
                                        className="mt-2 w-full"
                                        variant="outline"
                                        onClick={clearSelectedNodes}
                                    >
                                        Search selection
                                    </Button>
                                </div>
                            </ResizablePanel>
                            <ResizableHandle withHandle className='z-[100]' />
                        </>
                    }
                    {currentNode && (
                        <>
                            <ResizablePanel order={2} id="infos" defaultSize={30}>
                                <ProfilePanel sketch_id={sketchId} data={currentNode.data} />
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                        </>
                    )}
                    <ResizablePanel order={3} id="nodes" defaultSize={40}>
                        <NodesPanel isLoading={isLoading} nodes={processedNodes} />
                    </ResizablePanel>
                </ResizablePanelGroup>
            ) : (
                <div className="flex h-full items-center justify-center">
                </div>
            )}
        </ResizablePanel>
    )
})