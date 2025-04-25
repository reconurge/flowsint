import { memo } from "react"
import { Position } from "@xyflow/react"
import { DatabaseSchemaNode, DatabaseSchemaNodeBody, DatabaseSchemaNodeHeader, DatabaseSchemaTableCell, DatabaseSchemaTableRow } from "../ui/schema-node"
import { LabeledHandle } from "../ui/labeled-handle"
import { Badge } from "../ui/badge"

// Types for the scanner node
export interface ScannerNodeData extends Record<string, unknown> {
    class_name: string
    name: string
    module: string
    doc: string | null
    category: string
    type: string
    color: string
    inputs: { name: string, type: string }[]
    outputs: { name: string, type: string }[]
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
        prevProps.isConnectable === nextProps.isConnectable
    )
}

// Memoized scanner node component with custom equality check
const ScannerNode = memo(({ data, selected, isConnectable }: ScannerNodeProps) => {
    return (
        <DatabaseSchemaNode className="shadow-md !border-l-2 p-0" style={{ borderLeftWidth: "8px", borderLeftColor: data.color, cursor: "grab" }}
            selected={selected}>
            <DatabaseSchemaNodeHeader>
                <div className="flex flex-col items-start gap-1 relative">
                    <div className="absolute top-0 right-0">
                        <Badge variant={"outline"} className="">{data.type}</Badge>
                    </div>
                    <div className="font-semibold text-sm">
                        {data.class_name}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {data.doc}
                    </p>
                </div>
            </DatabaseSchemaNodeHeader>
            <div>
                <div className="grid grid-cols-2 py-1">
                    <div className="pl-0 pr-6">
                        {data.inputs.map((entry: { name: string, type: string }, i: number) => (
                            <LabeledHandle
                                isConnectable={isConnectable}
                                id={entry.name}
                                name={entry.name}
                                dataType={entry.type}
                                key={i}
                                type="target"
                                position={Position.Left}
                            />
                        ))}
                    </div>
                    <div className="pr-0">
                        {data.outputs.map((entry: { name: string, type: string }, i: number) => (
                            <LabeledHandle
                                isConnectable={isConnectable}
                                id={entry.name}
                                name={entry.name}
                                dataType={entry.type}
                                key={i}
                                type="source"
                                position={Position.Right}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </DatabaseSchemaNode>
    )
}, areEqual)

ScannerNode.displayName = "ScannerNode"

export default ScannerNode
