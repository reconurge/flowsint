"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useConfirm } from "@/components/use-confirm-dialog"
import { useGraphControls } from "@/stores/graph-controls-store"
import { useSketchStore } from "@/stores/sketch-store"
import { useModalStore } from "@/stores/store-settings"
import {
    ArrowDownUp,
    Copy,
    Filter,
    GitBranchIcon,
    Layers,
    LayoutGrid,
    Maximize,
    Minus,
    Trash,
    ZoomIn,
    Settings,
    RotateCw
} from "lucide-react"
import { memo, useCallback } from "react"
import { Separator } from "../ui/separator"
import { sketchService } from "@/api/sketch-service"
import { useParams } from "@tanstack/react-router"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

// Tooltip wrapper component to avoid repetition
const ToolbarButton = memo(function ToolbarButton({
    icon,
    tooltip,
    onClick,
    disabled = false
}: {
    icon: React.ReactNode;
    tooltip: string | React.ReactNode;
    onClick?: () => void;
    disabled?: boolean
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    onClick={onClick}
                    disabled={disabled}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                >
                    {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    )
})
export const Toolbar = memo(function Toolbar({ isLoading }: { isLoading: boolean }) {
    const selectedNodes = useSketchStore((state) => state.selectedNodes || [])
    const setOpenAddRelationDialog = useSketchStore((state) => state.setOpenAddRelationDialog)
    const removeNodes = useSketchStore((state) => state.removeNodes)
    const toggleSettings = useModalStore((s) => s.toggleSettings)
    const zoomToFit = useGraphControls((s) => s.zoomToFit);
    const zoomIn = useGraphControls((s) => s.zoomIn);
    const zoomOut = useGraphControls((s) => s.zoomOut);
    const { confirm } = useConfirm()
    const { id: sketchId, investigationId, type } = useParams({ from: "/_auth/dashboard/investigations/$investigationId/$type/$id" })

    const { refetch } = useQuery({
        queryKey: ["investigations", investigationId, type, sketchId, "data"],
        queryFn: () => type === "graph" ? sketchService.getGraphDataById(sketchId) : Promise.resolve(null),
        enabled: type === "graph"
    })

    const handleRefresh = useCallback(async () => {
        try {
            await refetch()
            toast.success("Graph data refreshed");
        } catch (error) {
            toast.error("Failed to refresh graph data");
        }
    }, [refetch]);

    const handleOpenRelationshipDialog = useCallback(() => {
        setOpenAddRelationDialog(true)
    }, [])

    const handleDeleteNodes = async () => {
        if (!selectedNodes.length) return
        if (!await confirm({ title: `You are about to delete ${selectedNodes.length} node(s).`, message: "The action is irreversible." })) return

        toast.promise(
            (async () => {
                removeNodes(selectedNodes.map((n) => n.id))
                return sketchService.deleteNodes(sketchId, JSON.stringify({ nodeIds: selectedNodes.map((n) => n.id) }))
            })(),
            {
                loading: `Deleting ${selectedNodes.length} node(s)...`,
                success: 'Nodes deleted successfully.',
                error: 'Failed to delete nodes.'
            }
        )
    }
    const isMoreThanZero = selectedNodes.length > 0
    const isTwo = selectedNodes.length == 2

    return (
        <div className="flex h-full flex-col items-center justify-start bg-background">
            <div className="flex flex-col justify-start items-center space-y-1 py-1">
                <TooltipProvider>
                    <ToolbarButton
                        onClick={handleOpenRelationshipDialog}
                        icon={<GitBranchIcon className="h-4 w-4 opacity-70" />}
                        tooltip="Create relation"
                        disabled={!isTwo}
                    />
                    <ToolbarButton
                        onClick={handleDeleteNodes}
                        icon={<Trash className="h-4 w-4 opacity-70" />}
                        tooltip="Delete"
                        disabled={!isMoreThanZero}
                    />
                    <Separator />
                    <ToolbarButton disabled icon={<Filter className="h-4 w-4 opacity-70" />} tooltip="Filter" />
                    <Separator />
                    <ToolbarButton
                        icon={<ZoomIn className="h-4 w-4 opacity-70" />}
                        tooltip="Zoom In"
                        onClick={zoomIn}
                    />
                    <ToolbarButton
                        icon={<Minus className="h-4 w-4 opacity-70" />}
                        tooltip="Zoom Out"
                        onClick={zoomOut}
                    />
                    <ToolbarButton
                        icon={<Maximize className="h-4 w-4 opacity-70" />}
                        tooltip="Fit to View"
                        onClick={zoomToFit}
                    />
                    <Separator />
                    <ToolbarButton onClick={toggleSettings} icon={<Settings className="h-4 w-4 opacity-70" />} tooltip="Settings" />
                    <Separator />
                    <ToolbarButton
                        onClick={handleRefresh}
                        disabled={isLoading}
                        icon={<RotateCw className={cn("h-4 w-4 opacity-70", isLoading && "animate-spin")} />}
                        tooltip="Refresh Graph Data"
                    />
                </TooltipProvider>
            </div>
        </div>
    )
})