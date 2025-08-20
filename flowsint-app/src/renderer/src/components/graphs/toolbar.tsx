
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useGraphControls } from "@/stores/graph-controls-store"
import {
    Maximize,
    Minus,
    ZoomIn,
    RotateCw,
    Waypoints,
    MapPin,
    List,
    SlidersHorizontal,
    GitFork,
    ArrowRightLeft,
    FunnelPlus
} from "lucide-react"
import { memo, useCallback } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import ForceControls from './force-controls'
import Filters from "./filters"
import { useGraphStore } from "@/stores/graph-store"

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

// Tooltip wrapper component to avoid repetition
export const ToolbarButton = memo(function ToolbarButton({
    icon,
    tooltip,
    onClick,
    disabled = false,
    badge = null
}: {
    icon: React.ReactNode;
    tooltip: string | React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    badge?: number | null;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div>
                    <Button
                        onClick={onClick}
                        disabled={disabled}
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 relative shadow-none"
                    >
                        {icon}
                        {badge && <span className="absolute -top-2 -right-2 z-50 bg-primary text-white text-[10px] rounded-full w-auto min-w-4.5 h-4.5 p-1 flex items-center justify-center">{badge}</span>}
                    </Button>
                </div>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    )
})
export const Toolbar = memo(function Toolbar({ isLoading }: { isLoading: boolean }) {
    const view = useGraphControls(s => s.view)
    const setView = useGraphControls((s) => s.setView)
    const zoomToFit = useGraphControls((s) => s.zoomToFit);
    const zoomIn = useGraphControls((s) => s.zoomIn);
    const zoomOut = useGraphControls((s) => s.zoomOut);
    const onLayout = useGraphControls((s) => s.onLayout);
    const refetchGraph = useGraphControls((s) => s.refetchGraph)
    const filters = useGraphStore(s => s.filters)

    const handleRefresh = useCallback(() => {
        try {
            refetchGraph()
            onLayout("dagre")
        } catch (error) {
            toast.error("Failed to refresh graph data");
        }
    }, [refetchGraph, onLayout]);

    const handleForceLayout = useCallback(() => {
        setView("force")
    }, [setView])

    const handleTableLayout = useCallback(() => {
        setView("table")
    }, [setView])

    const handleMapLayout = useCallback(() => {
        setView("map")
    }, [setView])

    const handleRelationshipsLayout = useCallback(() => {
        setView("relationships")
    }, [setView])

    const handleDagreLayoutTB = useCallback(() => {
        setView("hierarchy")
        onLayout && onLayout("dagre-tb")
    }, [onLayout, setView])

    return (
        <div className="flex justify-start gap-2 items-center">
            <TooltipProvider>
                <ToolbarButton
                    icon={<ZoomIn className="h-4 w-4 opacity-70" />}
                    tooltip="Zoom In"
                    onClick={zoomIn}
                    disabled={["table", "relationships"].includes(view)}
                />
                <ToolbarButton
                    icon={<Minus className="h-4 w-4 opacity-70" />}
                    tooltip="Zoom Out"
                    onClick={zoomOut}
                    disabled={["table", "relationships"].includes(view)}
                />
                <ToolbarButton
                    icon={<Maximize className="h-4 w-4 opacity-70" />}
                    tooltip="Fit to View"
                    onClick={zoomToFit}
                    disabled={["table", "relationships"].includes(view)}
                />

                <ToolbarButton
                    icon={<GitFork className="h-4 w-4 opacity-70 rotate-180" />}
                    tooltip={`Hierarchy (${isMac ? '⌘' : 'ctrl'}+Y)`}
                    disabled={["hierarchy"].includes(view)}
                    onClick={handleDagreLayoutTB}
                />

                <ToolbarButton
                    icon={<Waypoints className="h-4 w-4 opacity-70" />}
                    disabled={["force"].includes(view)}
                    tooltip={"Graph view"}
                    onClick={handleForceLayout}
                />
                <ToolbarButton
                    icon={<List className="h-4 w-4 opacity-70" />}
                    tooltip={"Table view"}
                    disabled={["table"].includes(view)}
                    onClick={handleTableLayout}
                />
                <ToolbarButton
                    icon={<ArrowRightLeft className="h-4 w-4 opacity-70" />}
                    tooltip={"Relationships view"}
                    disabled={["relationships"].includes(view)}
                    onClick={handleRelationshipsLayout}
                />
                <ToolbarButton
                    icon={<MapPin className="h-4 w-4 opacity-70" />}
                    tooltip={"Map view"}
                    disabled={["map"].includes(view)}
                    onClick={handleMapLayout}
                />
                <ToolbarButton
                    onClick={handleRefresh}
                    disabled={isLoading}
                    icon={<RotateCw className={cn("h-4 w-4 opacity-70", isLoading && "animate-spin")} />}
                    tooltip="Refresh Graph Data"
                />
                <ForceControls>
                    <ToolbarButton
                        disabled={isLoading || !["force", "hierarchy"].includes(view)}
                        icon={<SlidersHorizontal className={cn("h-4 w-4 opacity-70")} />}
                        tooltip="Settings"
                    />
                </ForceControls>
                <Filters>
                    <ToolbarButton
                        disabled={isLoading}
                        icon={<FunnelPlus className={cn("h-4 w-4 opacity-70")} />}
                        tooltip="Filters"
                        badge={filters && filters?.length > 0 ? filters?.length : null}
                    />
                </Filters>
            </TooltipProvider>
        </div>
    )
})