"use client"

import { AvatarList } from "@/components/avatar-list"
import MoreMenu from "@/components/sketches/more-menu"
import { ScanButton } from "@/components/sketches/scans-drawer/scan-button"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useConfirm } from "@/components/use-confirm-dialog"
import { cn } from "@/lib/utils"
import { useGraphControls } from "@/store/graph-controls-store"
import { useSketchStore } from "@/store/sketch-store"
import { useModalStore } from "@/store/store-settings"
import type { Profile } from "@/types"
import type { Sketch } from "@/types/sketch"
import { GearIcon } from "@radix-ui/react-icons"
import { useQuery } from "@tanstack/react-query"
import {
    ArrowDownUp,
    Copy,
    Filter,
    GitBranchIcon,
    Layers,
    LayoutGrid,
    Maximize,
    Minus,
    Redo,
    Rotate3DIcon,
    RotateCwIcon,
    Trash,
    Undo,
    ZoomIn,
} from "lucide-react"
import { notFound } from "next/navigation"
import { useQueryState } from "nuqs"
import { memo, useCallback, useMemo } from "react"


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
                    className="h-8 w-8"
                >
                    {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    )
})

// Separator component
const Separator = memo(() => <div className="h-6 w-px bg-border" />)

export const Toolbar = memo(function Toolbar({
    investigation_id,
    sketch_id,
    sketch,
    user_id,
}: {
    investigation_id: string;
    sketch_id: string;
    sketch: Sketch;
    user_id: string;
}) {

    const selectedNodes = useSketchStore((state) => state.selectedNodes || [])
    const setOpenAddRelationDialog = useSketchStore((state) => state.setOpenAddRelationDialog)
    const removeNodes = useSketchStore((state) => state.removeNodes)
    const toggleSettings = useModalStore((s) => s.toggleSettings)
    const zoomToFit = useGraphControls((s) => s.zoomToFit);
    const zoomIn = useGraphControls((s) => s.zoomIn);
    const zoomOut = useGraphControls((s) => s.zoomOut);
    const [_, setGraphView] = useQueryState("graphView", { defaultValue: "2d" })
    const { confirm } = useConfirm()


    const { refetch, isRefetching } = useQuery({
        queryKey: ["investigations", investigation_id, 'sketches', sketch_id, "data"],
        queryFn: async () => {
            const res = await fetch(`/api/investigations/${investigation_id}/sketches/${sketch_id}/sketch`)
            if (!res.ok) {
                notFound()
            }
            return res.json()
        },
        refetchOnWindowFocus: true,
    })

    const handleOpenRelationshipDialog = useCallback(() => {
        setOpenAddRelationDialog(true)
    }, [])

    const handleDeleteNodes = async () => {
        if (!selectedNodes.length) return
        if (!await confirm({ title: `You are about to delete ${selectedNodes.length} node(s).`, message: "The action is irreversible." })) return
        removeNodes(selectedNodes.map((n) => n.id))
    }

    // Memoize sketch members to prevent unnecessary rerenders
    const sketchMembers = useMemo(() =>
        sketch?.members?.map(({ profile }: { profile: Profile }) => ({
            ...profile,
            owner: profile.id === sketch.owner_id,
        })) || [],
        [sketch?.members, sketch?.owner_id]
    )
    const isMoreThanZero = selectedNodes.length > 0
    const isTwo = selectedNodes.length == 2

    return (
        <div className="flex items-center justify-between h-10 border-b px-2 bg-card">
            <div className="flex items-center space-x-1">
                <TooltipProvider>
                    <ToolbarButton disabled icon={<Undo className="h-4 w-4 opacity-70" />} tooltip="Undo" />
                    <ToolbarButton disabled icon={<Redo className="h-4 w-4 opacity-70" />} tooltip="Redo" />
                    <Separator />
                    <ToolbarButton
                        icon={<Copy className="h-4 w-4 opacity-70" />}
                        tooltip="Copy"
                        disabled={!isMoreThanZero}
                    />
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
                    <ToolbarButton disabled icon={<ArrowDownUp className="h-4 w-4 opacity-70" />} tooltip="Arrange" />
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
                    <ToolbarButton disabled icon={<LayoutGrid className="h-4 w-4 opacity-70" />} tooltip="Layout" />
                    <ToolbarButton disabled icon={<Layers className="h-4 w-4 opacity-70" />} tooltip="Layers" />
                    <ToolbarButton onClick={toggleSettings} icon={<GearIcon className="h-4 w-4 opacity-70" />} tooltip="Settings" />
                    <Separator />
                    {/* <Toggle className="h-8 w-8" onClick={() => setGraphView((prev) => prev === "2d" ? "3d" : "2d")} aria-label="Toggle italic">
                        <Rotate3DIcon className={cn("h-4 w-4 opacity-70")} />
                    </Toggle> */}
                    {/* <Separator /> */}
                    <ToolbarButton onClick={refetch} disabled={isRefetching} icon={<RotateCwIcon className={cn("h-4 w-4 opacity-70", isRefetching && "animate-spin")} />} tooltip="Reload" />
                </TooltipProvider>
            </div>
            <div className="flex items-center">
                <div className="px-2">
                    <AvatarList
                        size="md"
                        users={sketchMembers}
                    />
                </div>
                {/* <DownloadButton
                    endpoint={`/api/investigations/${investigation_id}/sketches/${sketch_id}/table`}
                    name={investigation_id}
                /> */}
                <MoreMenu sketch={sketch} user_id={user_id} />
                <ScanButton />
            </div>
        </div>
    )
})