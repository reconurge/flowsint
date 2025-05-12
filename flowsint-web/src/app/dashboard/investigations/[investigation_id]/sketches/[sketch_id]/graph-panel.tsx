import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ConsolePanel } from './console-panel'
import { memo, useState, useRef, useEffect } from 'react'
import Graph from './graph'

interface GraphPanelProps {
    query: any
}

export const GraphPanel = memo(function GraphPanel({ query }: GraphPanelProps) {
    const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false)
    const [panelDimensions, setPanelDimensions] = useState({ width: 0, height: 0 })
    const graphPanelRef = useRef<HTMLDivElement>(null)
    const updatePanelDimensions = () => {
        if (!graphPanelRef.current) return

        const rect = graphPanelRef.current.getBoundingClientRect()
        setPanelDimensions({
            width: rect.width,
            height: rect.height
        })
    }
    useEffect(() => {
        updatePanelDimensions()
        const resizeObserver = new ResizeObserver(() => {
            updatePanelDimensions()
        })
        if (graphPanelRef.current) {
            resizeObserver.observe(graphPanelRef.current)
        }
        return () => {
            resizeObserver.disconnect()
        }
    }, [])
    useEffect(() => {
        window.addEventListener('resize', updatePanelDimensions)
        return () => {
            window.removeEventListener('resize', updatePanelDimensions)
        }
    }, [])

    return (
        <div className="flex flex-col h-full">
            <div className="grow">
                <ResizablePanelGroup
                    direction="vertical"
                    className="h-full"
                    onLayout={updatePanelDimensions}
                >
                    <ResizablePanel
                        defaultSize={80}
                        className="h-full w-full bg-background"
                        onResize={updatePanelDimensions}
                    >
                        <div ref={graphPanelRef} className="h-full w-full">
                            <Graph
                                data={query.data}
                                isLoading={query.isLoading}
                                width={panelDimensions.width}
                                height={panelDimensions.height}
                            />
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel
                        defaultSize={20}
                        minSize={10}
                        maxSize={40}
                        collapsible={true}
                        onCollapse={() => setIsBottomPanelCollapsed(true)}
                        onExpand={() => setIsBottomPanelCollapsed(false)}
                        onResize={updatePanelDimensions}
                    >
                        <ConsolePanel />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    )
})
