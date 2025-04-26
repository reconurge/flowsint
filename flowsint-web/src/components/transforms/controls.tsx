import { memo, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaximizeIcon, ZoomInIcon, ZoomOutIcon, NetworkIcon, PlayIcon, SaveIcon, TrashIcon, XIcon } from "lucide-react";
import FullscreenButton from "../full-screen-button";
import { Panel } from "@xyflow/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import useLocalStorage from "@/lib/hooks/use-local-storage";
export const FlowControls = memo(({
    handleSaveTransform,
    loading,
    onLayout,
    fitView,
    zoomIn,
    zoomOut,
    handleDeleteTransform,
    setOpenTestTransform,
    isSaved
}: any) => {
    const [hide, setHide] = useLocalStorage('hide-transform-message', false)
    const handleHide = useCallback(() => {
        setHide(true)
    }, [])
    return (
        <>
            <Panel position="top-left" className="flex flex-col items-center gap-1">
                <FullscreenButton />
            </Panel>
            <Panel position="top-right" className="flex items-center gap-2">
                {isSaved &&
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={setOpenTestTransform}
                            >
                                Test simulation<PlayIcon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Test simulation</TooltipContent>
                    </Tooltip>}
                <Button
                    variant="outline"
                    disabled={loading}
                    onClick={handleSaveTransform}
                >
                    Save transform<SaveIcon className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size={"icon"}
                    onClick={handleDeleteTransform}
                >
                    <TrashIcon className="h-4 w-4" />
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
            {!hide && (
                <Panel position="bottom-right" className="flex flex-col items-center gap-1">
                    <div className="max-w-lg relative text-sm p-3 border border-orange-500 dark:border-orange-800/70 bg-orange-300 dark:bg-orange-700/30 text-white rounded-md">
                        <p className="flex items-center gap-1 font-bold mb-1"><InfoCircledIcon className="text-orange-500" /> Note</p>
                        <p>
                            Every input and output is under the list format. For example, SubdomainScanner will take a list of MinimalDomain and return a list of MinimalDomain.
                        </p>
                        <div className="absolute top-1 right-1">
                            <Button onClick={handleHide} variant={"ghost"} size="icon" className="h-6 w-6">
                                <XIcon />
                            </Button>
                        </div>
                    </div>
                </Panel>)}
        </>
    )
});