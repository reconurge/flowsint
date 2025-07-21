
import { Button } from "@/components/ui/button"
import { Panel } from "@xyflow/react"
import { Save, Trash2, ZoomIn, ZoomOut, Maximize, LayoutGrid } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TransformDetailsPanel } from "../transforms/transform-name-panel"

interface FlowControlsProps {
    loading: boolean
    handleSaveTransform: () => void
    handleDeleteTransform: () => void
    onLayout: () => void
    fitView: () => void
    zoomIn: () => void
    zoomOut: () => void
    isSaved: boolean,
    transform?: any
}

export function FlowControls({
    loading,
    handleSaveTransform,
    handleDeleteTransform,
    onLayout,
    fitView,
    zoomIn,
    zoomOut,
    isSaved,
    transform
}: FlowControlsProps) {
    return (
        <TooltipProvider>
            <TransformDetailsPanel transform={transform} />
            <Panel position="bottom-right" className="flex gap-2 mt-28 mr-2 z-40">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-card" onClick={handleSaveTransform} disabled={loading}>
                            <Save className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Save Transform</p>
                    </TooltipContent>
                </Tooltip>

                {isSaved && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="bg-card"
                                onClick={handleDeleteTransform}
                                disabled={loading}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Delete Transform</p>
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
