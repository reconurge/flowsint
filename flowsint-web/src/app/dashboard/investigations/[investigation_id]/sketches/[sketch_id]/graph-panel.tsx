import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ConsolePanel } from './console-panel'
import { memo, useState, useRef, useEffect } from 'react'
import Neo4jGraph from './graph'

interface GraphPanelProps {
    query: any
    minimapRef: any
}

export const GraphPanel = memo(function GraphPanel({ query, minimapRef }: GraphPanelProps) {
    const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false)
    const [panelDimensions, setPanelDimensions] = useState({ width: 0, height: 0 })
    const graphPanelRef = useRef<HTMLDivElement>(null)

    // Fonction pour mettre à jour les dimensions du panel
    const updatePanelDimensions = () => {
        if (!graphPanelRef.current) return

        const rect = graphPanelRef.current.getBoundingClientRect()
        setPanelDimensions({
            width: rect.width,
            height: rect.height
        })
    }

    // Mettre à jour les dimensions au montage et lors des redimensionnements
    useEffect(() => {
        updatePanelDimensions()

        // Observer les changements de taille
        const resizeObserver = new ResizeObserver(() => {
            updatePanelDimensions()
        })

        if (graphPanelRef.current) {
            resizeObserver.observe(graphPanelRef.current)
        }

        // Nettoyer l'observer
        return () => {
            resizeObserver.disconnect()
        }
    }, [])

    // Mettre à jour les dimensions lors des changements de fenêtre
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
                            <Neo4jGraph
                                minimapRef={minimapRef}
                                data={query.data}
                                isLoading={query.isLoading}
                                width={panelDimensions.width}
                                height={panelDimensions.height}
                            />
                        </div>
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
                        onResize={updatePanelDimensions}
                    >
                        <ConsolePanel />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    )
})
