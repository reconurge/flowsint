"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useConfirm } from "@/components/use-confirm-dialog"
import { useGraphControls } from "@/stores/graph-controls-store"
import { useGraphStore } from "@/stores/graph-store"
import {
    Maximize,
    Minus,
    Trash,
    ZoomIn,
    RotateCw,
    GitPullRequestCreate,
    GitFork,
    Waypoints,
    Rotate3D,
} from "lucide-react"
import { memo, useCallback } from "react"
import { sketchService } from "@/api/sketch-service"
import { useParams } from "@tanstack/react-router"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut"

// Tooltip wrapper component to avoid repetition
const ToolbarButton = memo(function ToolbarButton({
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
                        {badge && <span className="absolute -top-2 -right-2 z-50 bg-primary text-white text-[10px] rounded-full w-4.5 h-4.5 flex items-center justify-center line-height-0">{badge}</span>}
                    </Button>
                </div>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    )
})
export const Toolbar = memo(function Toolbar({ isLoading }: { isLoading: boolean }) {
    const { id: sketchId } = useParams({ from: "/_auth/dashboard/investigations/$investigationId/$type/$id" })
    const selectedNodes = useGraphStore((state) => state.selectedNodes || [])
    const setOpenAddRelationDialog = useGraphStore((state) => state.setOpenAddRelationDialog)
    const setView = useGraphControls((s) => s.setView)
    const removeNodes = useGraphStore((state) => state.removeNodes)
    const zoomToFit = useGraphControls((s) => s.zoomToFit);
    const zoomIn = useGraphControls((s) => s.zoomIn);
    const zoomOut = useGraphControls((s) => s.zoomOut);
    const onLayout = useGraphControls((s) => s.onLayout);
    const { confirm } = useConfirm()
    const refetchGraph = useGraphControls((s) => s.refetchGraph)
    const nodesLength = useGraphStore((s) => s.getNodesLength())

    const handleRefresh = useCallback(() => {
        try {
            refetchGraph()
            onLayout("dagre")
        } catch (error) {
            toast.error("Failed to refresh graph data");
        }
    }, [refetchGraph, onLayout]);

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
    const isGraphOnly = nodesLength > 500

    const handleForceLayout = useCallback(() => {
        setView("force")
    }, [setView])

    const handleForce3DLayout = useCallback(() => {
        setView("force3d")
    }, [setView])

    const handleDagreLayout = useCallback(() => {
        setView("hierarchy")
        onLayout && onLayout("dagre")
    }, [onLayout, setView])

    const { isMac } = useKeyboardShortcut({
        key: "y",
        ctrlOrCmd: true,
        callback: handleDagreLayout
    })

    return (
        <div className="flex justify-start gap-2 items-center">
            <TooltipProvider>
                <ToolbarButton
                    onClick={handleOpenRelationshipDialog}
                    icon={<GitPullRequestCreate className="h-4 w-4 opacity-70" />}
                    tooltip="Create relation"
                    disabled={!isTwo}
                />
                <ToolbarButton
                    onClick={handleDeleteNodes}
                    icon={<Trash className="h-4 w-4 opacity-70" />}
                    tooltip="Delete"
                    disabled={!isMoreThanZero}
                    badge={isMoreThanZero ? selectedNodes.length : null}
                />
                {/* <ToolbarButton disabled icon={<Filter className="h-4 w-4 opacity-70" />} tooltip="Filter" /> */}
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
                <ToolbarButton
                    icon={<GitFork className="h-4 w-4 opacity-70" />}
                    tooltip={isGraphOnly ? "Graph is too large to render in hierarchy layout" : `Hierarchy (${isMac ? '⌘' : 'ctrl'}+Y)`}
                    onClick={handleDagreLayout}
                    disabled={isGraphOnly}
                />
                <ToolbarButton
                    icon={<Waypoints className="h-4 w-4 opacity-70" />}
                    tooltip={"Graph"}
                    onClick={handleForceLayout}
                />
                <ToolbarButton
                    icon={<Rotate3D className="h-4 w-4 opacity-70" />}
                    tooltip={"3D Graph"}
                    onClick={handleForce3DLayout}
                />
                {/* <ToolbarButton onClick={toggleSettings} icon={<Settings className="h-4 w-4 opacity-70" />} tooltip="Settings" /> */}
                <ToolbarButton
                    onClick={handleRefresh}
                    disabled={isLoading}
                    icon={<RotateCw className={cn("h-4 w-4 opacity-70", isLoading && "animate-spin")} />}
                    tooltip="Refresh Graph Data"
                />
            </TooltipProvider>
        </div>
    )
})