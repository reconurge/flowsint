import { memo } from "react";
import { Button } from "@/components/ui/button";
import { MaximizeIcon, ZoomInIcon, ZoomOutIcon, NetworkIcon, PlayIcon, SaveIcon } from "lucide-react";
import FullscreenButton from "../full-screen-button";
import { Panel } from "@xyflow/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
export const FlowControls = memo(({
    handleSaveSimulation,
    loading,
    onLayout,
    fitView,
    zoomIn,
    zoomOut,
}: any) => {
    return (
        <>
            <Panel position="top-left" className="flex flex-col items-center gap-1">
                <FullscreenButton />
            </Panel>
            <Panel position="top-right" className="flex items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            disabled
                        >
                            Start simulation<PlayIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Start simulation</TooltipContent>
                </Tooltip>
                <Button
                    variant="outline"
                    disabled={loading}
                    onClick={handleSaveSimulation}
                >
                    Save transform<SaveIcon className="h-4 w-4" />
                </Button>
            </Panel>
            <Panel position="bottom-left" className="flex flex-col items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => onLayout()}
                        >
                            <NetworkIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Auto layout</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" onClick={fitView}>
                            <MaximizeIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Center view</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" onClick={zoomIn}>
                            <ZoomInIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom in</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" onClick={() => zoomOut()}>
                            <ZoomOutIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom out</TooltipContent>
                </Tooltip>
            </Panel>
        </>
    )
});