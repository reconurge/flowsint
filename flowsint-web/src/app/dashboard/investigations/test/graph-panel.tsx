import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Network, Plus } from 'lucide-react'
import Graph from './graph'
import { ConsolePanel } from './console-panel'
import { useState } from 'react'

interface GraphPanelProps {
    activeTab: string
    setActiveTab: (tab: string) => void
    currentNode: any
    setCurrentNode: (node: any) => void
    setOpenDialog: (open: boolean) => void
    data: any
}

export function GraphPanel({ activeTab, setActiveTab, currentNode, setCurrentNode, setOpenDialog, data }: GraphPanelProps) {
    const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false)

    return (
        <div className="flex flex-col h-full">
            {/* Tabs header */}
            <div className="border-b bg-card">
                <div className="flex items-center px-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="bg-muted h-9">
                            <TabsTrigger value="graph1" className="text-xs">Investigation 1</TabsTrigger>
                            <TabsTrigger value="graph2" className="text-xs">OSINT Analysis</TabsTrigger>
                            <TabsTrigger value="graph3" className="text-xs">Network Map</TabsTrigger>
                            <Button variant="ghost" size="icon" className="h-7 w-7 ml-1">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Content area with vertical resizable panels */}
            <div className="grow">
                <ResizablePanelGroup direction="vertical" className="h-full">
                    <ResizablePanel defaultSize={80} className="h-full">
                        {/* Tab content */}
                        <Tabs value={activeTab} className="h-full">
                            <TabsContent value="graph1" className="h-full w-full m-0 p-0">
                                <Graph currentNode={currentNode} setOpenDialog={setOpenDialog} data={data} setCurrentNode={setCurrentNode} />
                            </TabsContent>
                            <TabsContent value="graph2" className="h-full m-0 p-0 data-[state=active]:block">
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    <Network className="h-16 w-16 opacity-20 mr-2" />
                                    <span>OSINT Analysis Graph</span>
                                </div>
                            </TabsContent>
                            <TabsContent value="graph3" className="h-full m-0 p-0 data-[state=active]:block">
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    <Network className="h-16 w-16 opacity-20 mr-2" />
                                    <span>Network Map Graph</span>
                                </div>
                            </TabsContent>
                        </Tabs>
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
}