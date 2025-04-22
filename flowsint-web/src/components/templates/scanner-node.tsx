import { memo } from "react"
import { Handle, Position } from "@xyflow/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Types for the scanner node
export interface ScannerNodeData extends Record<string, unknown> {
    class_name: string
    name: string
    module: string
    doc: string | null
    key: string
    category: string
    color: string
}

interface ScannerNodeProps {
    data: ScannerNodeData
    isConnectable?: boolean
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
const ScannerNode = memo(({ data, isConnectable }: ScannerNodeProps) => {
    return (
        <div className="relative">
            <Card className="w-64 shadow-md border-l-2" style={{ borderLeftColor: data.color }}>
                <CardHeader className="p-3 pb-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-sm font-medium">{data.class_name}</CardTitle>
                            <CardDescription className="text-xs">{data.name}</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {data.category || "unknown"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                    {data.doc && <p className="text-xs text-muted-foreground mb-2">{data.doc}</p>}
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                            Key: {data.key}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" isConnectable={isConnectable} />
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" isConnectable={isConnectable} />

        </div>
    )
}, areEqual)

ScannerNode.displayName = "ScannerNode"

export default ScannerNode
