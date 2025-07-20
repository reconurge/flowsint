import { memo, useCallback } from "react"
import { Position } from "@xyflow/react"
import { LabeledHandle } from "../ui/labeled-handle"
import { Badge } from "../ui/badge"
import { BaseNodeSchema } from "../ui/base-node"
import { NodeStatusIndicator } from "../ui/node-status-indicator"
import { useNodesDisplaySettings } from "@/stores/node-display-settings"
import { useIcon } from "@/hooks/use-icon"
import { cn } from "@/lib/utils"
import { KeySquare } from "lucide-react"
import { type ScannerNodeProps } from "@/types/transform"
import { TransformNode, useTransformStore } from "@/stores/transform-store"

// Custom equality function to prevent unnecessary re-renders
function areEqual(prevProps: ScannerNodeProps, nextProps: ScannerNodeProps) {
    return (
        prevProps.data.class_name === nextProps.data.class_name &&
        prevProps.data.name === nextProps.data.name &&
        prevProps.data.module === nextProps.data.module &&
        prevProps.data.doc === nextProps.data.doc &&
        prevProps.data.key === nextProps.data.key &&
        prevProps.data.category === nextProps.data.category &&
        prevProps.data.color === nextProps.data.color &&
        prevProps.data.computationState === nextProps.data.computationState &&
        prevProps.isConnectable === nextProps.isConnectable
    )
}

const getStateColor = (state?: string) => {
    switch (state) {
        case "pending":
            return "bg-gray-200 text-gray-700"
        case "processing":
            return "bg-blue-100 text-blue-700"
        case "completed":
            return "bg-green-100 text-green-700"
        case "error":
            return "bg-red-100 text-red-700"
        default:
            return "bg-gray-200 text-gray-700"
    }
}

// Memoized scanner node component with custom equality check
const ScannerNode = memo(({ data, selected, isConnectable }: ScannerNodeProps) => {
    const colors = useNodesDisplaySettings(s => s.colors)
    const inputColor = colors[data.inputs.type.toLowerCase()]
    const outputColor = colors[data.outputs.type.toLowerCase()]
    const opacity = data.computationState === "pending" ? 0.5 : 1
    const InputIconComponent = useIcon(data.inputs.type.toLowerCase() as string, null);
    const OutputIconComponent = useIcon(data.outputs.type.toLowerCase() as string, null);
    const setOpenParamsDialog = useTransformStore(s => s.setOpenParamsDialog)

    const handleOpenParamsModal = useCallback(() => {
        setOpenParamsDialog(true, data as unknown as TransformNode)
    }, [setOpenParamsDialog, data])


    const getStatusVariant = (state?: string) => {
        switch (state) {
            case "pending":
                return "pending"
            case "processing":
                return "loading"
            case "completed":
                return "success"
            case "error":
                return "error"
            default:
                return undefined
        }
    }

    return (
        <NodeStatusIndicator variant={getStatusVariant(data.computationState)} showStatus={data.type !== "type"}>
            <BaseNodeSchema
                className={cn("shadow-md relative p-0 bg-background ", data.type === "type" ? "rounded-full !max-w-[240px]" : "rounded-md !max-w-[340px]")}
                style={{ borderLeftWidth: 5, borderRightWidth: 5, borderLeftColor: inputColor ?? outputColor, borderRightColor: outputColor, cursor: "grab", opacity }}
                selected={selected}
            >
                {data.type !== "type" &&
                    <div className="p-3 bg-card rounded-t-md">
                        <div className="flex flex-col items-start gap-1 relative">
                            <div className="absolute top-0 right-0 flex items-center gap-2">
                                {data.computationState && data.type !== "type" && (
                                    <Badge className={getStateColor(data.computationState)}>
                                        {data.computationState}
                                    </Badge>
                                )}
                            </div>
                            <div className="font-semibold text-sm">{data.class_name}</div>
                            <p className="text-xs text-muted-foreground mt-2">{data.doc}</p>
                        </div>
                    </div>
                }
                <div>
                    <div className={cn("grid grid-cols-2 py-1", data.type === "type" ? "grid-cols-1 p-2" : "grid-cols-2")}>
                        <div className="pl-0 pr-6">
                            {data.inputs.properties.length > 0 && (
                                <LabeledHandle
                                    isConnectable={isConnectable}
                                    id={data.inputs.type}
                                    label={<span className="flex items-center gap-1">{data.inputs.type}<InputIconComponent size={12} /></span>}
                                    description={`${data.inputs.properties.length} properties`}
                                    type="target"
                                    position={Position.Left}
                                />
                            )}
                        </div>
                        <div className="pr-0">
                            {data.outputs.properties.length > 0 && (
                                <LabeledHandle
                                    isConnectable={isConnectable}
                                    id={data.outputs.type}
                                    label={<span className="flex items-center gap-1"><OutputIconComponent size={12} />{data.outputs.type}</span>}
                                    description={`${data.inputs.properties.length} properties`}
                                    type="source"
                                    position={Position.Right}
                                />
                            )}
                        </div>
                    </div>
                    {data.requires_key &&
                        <Badge onClick={handleOpenParamsModal} variant={"outline"} className="absolute top-3 right-3">
                            Key required <KeySquare className="h-4 w-4 text-yellow-500" />
                        </Badge>
                    }
                </div>
            </BaseNodeSchema>
        </NodeStatusIndicator>
    )
}, areEqual)

ScannerNode.displayName = "ScannerNode"

export default ScannerNode
