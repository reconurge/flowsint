import { Button } from '@/components/ui/button'
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import NodesPanel from '@/components/sketches/sketch/nodes-panel'
import ProfilePanel from '@/components/sketches/sketch/profile-panel'

interface RightPanelProps {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
    currentNode: any
}

export function RightPanel({ isCollapsed, setIsCollapsed, currentNode }: RightPanelProps) {
    return (
        <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={40}
            className="h-full bg-card"
            collapsible={true}
            collapsedSize={4}
            onCollapse={() => setIsCollapsed(true)}
            onExpand={() => setIsCollapsed(false)}
        >
            {!isCollapsed ? (
                <ResizablePanelGroup autoSaveId="conditional" direction="vertical">
                    {currentNode && (
                        <>
                            <ResizablePanel order={1} id="top" defaultSize={40}>
                                <div className="flex h-8 items-center justify-between border-b px-4 bg-card">
                                    <h2 className="font-medium text-sm">Properties</h2>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </div>
                                <ProfilePanel data={currentNode.data} />
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                        </>
                    )}
                    <ResizablePanel order={2} id="bottom" defaultSize={60}>
                        <div className="flex h-8 items-center justify-between border-b px-4 bg-card">
                            <h2 className="font-medium text-sm">Entities</h2>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>
                        <NodesPanel nodes={[]} />
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
}