import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader, Network, Plus } from 'lucide-react'
import InvestigationGraph from "@/components/sketches/sketch/graph"
import { ConsolePanel } from './console-panel'
import { memo, useState } from 'react'

interface GraphPanelProps {
    query: any
}
export const GraphPanel = memo(function GraphPanel({ query }: GraphPanelProps) {
    const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false)
    return (
        <div className="flex flex-col h-full">
            <div className="grow">
                <ResizablePanelGroup direction="vertical" className="h-full">
                    <ResizablePanel defaultSize={80} className="h-full w-full bg-">
                        <InvestigationGraph graphQuery={query} />
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