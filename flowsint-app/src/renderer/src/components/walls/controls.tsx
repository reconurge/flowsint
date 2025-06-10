"use client"

import { Button } from "@/components/ui/button"
import { Panel } from "@xyflow/react"
import { Save, Trash2, ZoomIn, ZoomOut, Maximize, LayoutGrid } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FlowControlsProps {
    loading: boolean
    handleSaveWall: () => void
    handleDeleteWall: () => void
    onLayout: () => void
    fitView: () => void
    zoomIn: () => void
    zoomOut: () => void
    isSaved: boolean,
    wall?: any
}

export function FlowControls({
    loading,
    handleSaveWall,
    handleDeleteWall,
    onLayout,
    fitView,
    zoomIn,
    zoomOut,
    isSaved,
    wall
}: FlowControlsProps) {
    return (
        <TooltipProvider>
            <Panel position="bottom-right" className="flex gap-2 mt-28 mr-2 z-40">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-card" onClick={handleSaveWall} disabled={loading}>
                            <Save className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Save Wall</p>
                    </TooltipContent>
                </Tooltip>

                {isSaved && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="bg-card"
                                onClick={handleDeleteWall}
                                disabled={loading}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Delete Wall</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-card" onClick={onLayout}>
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Auto Layout</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-card" onClick={fitView}>
                            <Maximize className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Fit View</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-card" onClick={zoomIn}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Zoom In</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-card" onClick={zoomOut}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Zoom Out</p>
                    </TooltipContent>
                </Tooltip>
            </Panel>
        </TooltipProvider>
    )
}
