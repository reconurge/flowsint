"use client"

import type React from "react"

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ConsolePanel } from "./console-panel"
import { memo, useState, useRef, useEffect } from "react"
import Graph2d from "./cosmo-graph"
import { useSketchStore } from "@/store/sketch-store"
import { cn } from "@/lib/utils"
import { ArrowDownToLineIcon } from "lucide-react"

interface GraphPanelProps {
    query: any
}

export const GraphPanel = memo(function GraphPanel({ query }: GraphPanelProps) {
    const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false)
    const [panelDimensions, setPanelDimensions] = useState({ width: 0, height: 0 })
    const [isDraggingOver, setIsDraggingOver] = useState(false)
    const handleOpenFormModal = useSketchStore(s => s.handleOpenFormModal)

    const graphPanelRef = useRef<HTMLDivElement>(null)

    const updatePanelDimensions = () => {
        if (!graphPanelRef.current) return
        const rect = graphPanelRef.current.getBoundingClientRect()
        setPanelDimensions({
            width: rect.width,
            height: rect.height,
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
        window.addEventListener("resize", updatePanelDimensions)
        return () => {
            window.removeEventListener("resize", updatePanelDimensions)
        }
    }, [])

    // Handle drag events
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDraggingOver(true)
    }

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDraggingOver(true)
    }

    const handleDragLeave = () => {
        setIsDraggingOver(false)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDraggingOver(false)
        const data = e.dataTransfer.getData("text/plain")
        if (data) {
            try {
                const parsedData = JSON.parse(data)
                handleOpenFormModal(parsedData.itemKey)
            } catch (error) {
                return
            }
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="grow">
                <ResizablePanelGroup direction="vertical" className="h-full" onLayout={updatePanelDimensions}>
                    <ResizablePanel defaultSize={80} className="h-full w-full" onResize={updatePanelDimensions}>
                        <div
                            ref={graphPanelRef}
                            className={cn('h-full w-full relative outline-2 outline-transparent bg-background')} onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <Graph2d
                                data={query.data}
                                isLoading={query.isLoading}
                                width={panelDimensions.width}
                                height={panelDimensions.height}
                            />
                            {isDraggingOver &&
                                <div className={cn('absolute flex items-center justify-center inset-0 bg-primary/20 backdrop-blur-xs gap-1')}>
                                    <p className="font-medium">Drop here to add node</p> <ArrowDownToLineIcon className="opacity-60" />
                                </div>
                            }
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel
                        defaultSize={20}
                        minSize={10}
                        maxSize={40}
                        collapsedSize={2}
                        collapsible={true}
                        onCollapse={() => setIsBottomPanelCollapsed(true)}
                        onExpand={() => setIsBottomPanelCollapsed(false)}
                        onResize={updatePanelDimensions}
                    >
                        {!isBottomPanelCollapsed && <ConsolePanel />}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    )
})
