import { memo } from "react"
import { Position } from "@xyflow/react"
import { LabeledHandle } from "../ui/labeled-handle"
import { Badge } from "../ui/badge"
import { BaseNodeSchema } from "../ui/base-node"
import { getScannerColor } from "./scanner-data"
import { NodeStatusIndicator } from "../ui/node-status-indicator"

// Types for the scanner node based on the new structure
export interface ScannerNodeData extends Record<string, unknown> {
    class_name: string
    name: string
    module: string
    doc: string | null
    category: string
    type: string
    color?: string
    computationState?: "pending" | "processing" | "completed" | "error"
    inputs: {
        type: string
        properties: Array<{
            name: string
            type: string
        }>
    }
    outputs: {
        type: string
        properties: Array<{
            name: string
            type: string
        }>
    }
}

interface ScannerNodeProps {
    data: ScannerNodeData
    isConnectable?: boolean
    selected?: boolean
}

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
    const color = getScannerColor(data.type, data.category)
    const opacity = data.computationState === "pending" ? 0.5 : 1

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
        <NodeStatusIndicator variant={getStatusVariant(data.computationState)}>
            <BaseNodeSchema
                className="shadow-md rounded-md p-0 bg-background !max-w-[340px]"
                style={{ borderLeftWidth: 4, borderLeftColor: color, cursor: "grab", opacity }}
                selected={selected}
            >
                <div className="p-3 bg-card rounded-t-md">
                    <div className="flex flex-col items-start gap-1 relative">
                        <div className="absolute top-0 right-0 flex items-center gap-2">
                            {/* <Badge variant={"outline"} className="">
                                {data.type}
                            </Badge> */}
                            {data.computationState && (
                                <Badge className={getStateColor(data.computationState)}>
                                    {data.computationState}
                                </Badge>
                            )}
                        </div>
                        <div className="font-semibold text-sm">{data.class_name}</div>
                        <p className="text-xs text-muted-foreground mt-2">{data.doc}</p>
                    </div>
                </div>
                <div>
                    <div className="grid grid-cols-2 py-1">
                        <div className="pl-0 pr-6">
                            <p className="font-bold text-center text-xs mb-2">{data.inputs.type}</p>
                            {data?.inputs?.properties?.map((property, i) => (
                                <LabeledHandle
                                    isConnectable={isConnectable}
                                    id={property.name}
                                    name={property.name}
                                    dataType={property.type}
                                    key={i}
                                    type="target"
                                    position={Position.Left}
                                />
                            ))}
                        </div>
                        <div className="pr-0">
                            <p className="font-bold text-center pr-1 text-xs mb-2">{data.outputs.type}</p>
                            {data?.outputs?.properties?.map((property, i) => (
                                <LabeledHandle
                                    isConnectable={isConnectable}
                                    id={property.name}
                                    name={property.name}
                                    dataType={property.type}
                                    key={i}
                                    type="source"
                                    position={Position.Right}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </BaseNodeSchema>
        </NodeStatusIndicator>
    )
}, areEqual)

ScannerNode.displayName = "ScannerNode"

export default ScannerNode
