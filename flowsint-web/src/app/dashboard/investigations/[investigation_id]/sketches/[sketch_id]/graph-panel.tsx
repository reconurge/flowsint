import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ConsolePanel } from './console-panel'
import { memo, useState } from 'react'
import Neo4jGraph from './graph'

interface GraphPanelProps {
    query: any
    minimapRef: any
}
export const GraphPanel = memo(function GraphPanel({ query, minimapRef }: GraphPanelProps) {
    const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false)
    return (
        <div className="flex flex-col h-full">
            <div className="grow">
                <ResizablePanelGroup direction="vertical" className="h-full">
                    <ResizablePanel defaultSize={80} className="h-full w-full bg-">
                        <Neo4jGraph minimapRef={minimapRef} data={query.data} isLoading={query.isLoading} />
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Bottom Console Panel */}
                    <ResizablePanel
                        defaultSize={20}
                        minSize={10}
                        maxSize={40}
                        collapsible={true}
                        onCollapse={() => setIsBottomPanelCollapsed(true)}
                        onExpand={() => setIsBottomPanelCollapsed(false)}
                    >
                        <ConsolePanel />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    )
})