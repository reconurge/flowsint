"use client"

import { AvatarList } from "@/components/avatar-list"
import { DownloadButton } from "@/components/download-button"
import MoreMenu from "@/components/sketches/more-menu"
import { ScanButton } from "@/components/sketches/scans-drawer/scan-button"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useFlowStore } from "@/store/flow-store"
import type { Profile } from "@/types"
import type { Sketch } from "@/types/sketch"
import { useEdges, useNodes, useReactFlow } from "@xyflow/react"
import {
    ArrowDownUp,
    Copy,
    Filter,
    Layers,
    LayoutGrid,
    Maximize,
    Minus,
    Redo,
    Save,
    Settings,
    Share2,
    Trash,
    Undo,
    ZoomIn,
} from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { shallow } from "zustand/shallow"
import { toast } from "sonner"
import { saveSchemaToNeo4j } from "@/lib/actions/sketches"
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut"

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
    user_id: string
}) {
    const reactFlowInstance = useReactFlow()
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<string | null>(null)
    // Optimize store selector with specific selection

    const { isMac } = useKeyboardShortcut({
        key: "s",
        ctrlOrCmd: true,
        callback: () => {
            saveSchema()
        },
    })

    const { currentNode } = useFlowStore(
        state => ({
            currentNode: state.currentNode,
        }),
        shallow
    )

    // Memoize sketch members to prevent unnecessary rerenders
    const sketchMembers = useMemo(() =>
        sketch?.members?.map(({ profile }: { profile: Profile }) => ({
            ...profile,
            owner: profile.id === sketch.owner_id,
        })) || [],
        [sketch?.members, sketch?.owner_id]
    )

    const saveSchema = useCallback(async () => {
        if (isSaving) return

        const saveOperation = async () => {
            setIsSaving(true)
            try {
                const nodes = reactFlowInstance.getNodes()
                const edges = reactFlowInstance.getEdges()
                const result = await saveSchemaToNeo4j({ nodes, edges, sketch_id })

                if (!result.success) {
                    throw new Error(result.error || "Failed to save schema")
                }

                setLastSaved(result.timestamp as string)
                return result
            } finally {
                setIsSaving(false)
            }
        }

        return toast.promise(saveOperation(), {
            loading: 'Saving schema...',
            success: 'Schema saved successfully',
            error: (err) => `${err.message || 'Unexpected error during schema save'}`
        })
    }, [isSaving, reactFlowInstance, sketch_id])



    // Handle zoom in
    const handleZoomIn = useCallback(() => {
        reactFlowInstance.zoomIn()
    }, [reactFlowInstance])

    // Handle zoom out
    const handleZoomOut = useCallback(() => {
        reactFlowInstance.zoomOut()
    }, [reactFlowInstance])

    // Handle fit view
    const handleFitView = useCallback(() => {
        reactFlowInstance.fitView({ padding: 0.2 })
    }, [reactFlowInstance])

    return (
        <div className="flex items-center justify-between h-10 border-b px-2 bg-card">
            <div className="flex items-center space-x-1">
                <TooltipProvider>
                    <ToolbarButton icon={<Undo className="h-4 w-4" />} tooltip="Undo" />
                    <ToolbarButton icon={<Redo className="h-4 w-4" />} tooltip="Redo" />

                    <Separator />

                    <ToolbarButton
                        icon={<Copy className="h-4 w-4" />}
                        tooltip="Copy"
                        disabled={!currentNode}
                    />
                    <ToolbarButton
                        icon={<Trash className="h-4 w-4" />}
                        tooltip="Delete"
                        disabled={!currentNode}
                    />
                    <Separator />
                    <ToolbarButton icon={<ArrowDownUp className="h-4 w-4" />} tooltip="Arrange" />
                    <ToolbarButton icon={<Filter className="h-4 w-4" />} tooltip="Filter" />
                    <Separator />
                    <ToolbarButton
                        icon={<ZoomIn className="h-4 w-4" />}
                        tooltip="Zoom In"
                        onClick={handleZoomIn}
                    />
                    <ToolbarButton
                        icon={<Minus className="h-4 w-4" />}
                        tooltip="Zoom Out"
                        onClick={handleZoomOut}
                    />
                    <ToolbarButton
                        icon={<Maximize className="h-4 w-4" />}
                        tooltip="Fit to View"
                        onClick={handleFitView}
                    />

                    <Separator />

                    <ToolbarButton icon={<LayoutGrid className="h-4 w-4" />} tooltip="Layout" />
                    <ToolbarButton icon={<Layers className="h-4 w-4" />} tooltip="Layers" />

                    <div className="ml-auto flex items-center gap-2">
                        <ToolbarButton
                            icon={<Save className={`h-4 w-4 ${isSaving ? 'animate-pulse' : ''}`} />}
                            tooltip={isSaving ? "Saving..." : <kbd className="px-2 py-1 rounded border">{isMac ? "⌘" : "Ctrl"}+S</kbd>}
                            disabled={isSaving}
                            onClick={saveSchema}
                        />
                        <ToolbarButton icon={<Share2 className="h-4 w-4" />} tooltip="Share" />
                        <ToolbarButton icon={<Settings className="h-4 w-4" />} tooltip="Settings" />
                    </div>
                </TooltipProvider>
            </div>
            <div className="flex items-center">
                <div className="px-2">
                    <AvatarList
                        size="md"
                        users={sketchMembers}
                    />
                </div>
                <DownloadButton
                    endpoint={`/api/investigations/${investigation_id}/sketches/${sketch_id}/table`}
                    name={investigation_id}
                />
                <MoreMenu sketch={sketch} user_id={user_id} />
                <ScanButton />
            </div>
        </div>
    )
})