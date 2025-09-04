import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,

} from "@/components/ui/sheet"
import { FlowEdge, FlowNode, useFlowStore } from "@/stores/flow-store"
import { memo, useCallback, useMemo, useState } from "react"
import { TriangleAlert, Loader2, ArrowRight } from "lucide-react"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNodesDisplaySettings } from "@/stores/node-display-settings"
import { Scanner } from "@/types/transform"
import { useQuery } from "@tanstack/react-query"
import { Input } from "../ui/input"
import { Alert, AlertDescription } from "../ui/alert"
import { useIcon } from "@/hooks/use-icon"
import { flowService } from "@/api/flow-service"

const FlowSheet = ({ onLayout }: { onLayout: () => void }) => {
    const openFlowSheet = useFlowStore(state => state.openFlowSheet)
    const setOpenFlowSheet = useFlowStore(state => state.setOpenFlowSheet)
    const selectedNode = useFlowStore(state => state.selectedNode)
    const setNodes = useFlowStore(state => state.setNodes)
    const setEdges = useFlowStore(state => state.setEdges)
    const colors = useNodesDisplaySettings(s => s.colors)

    const { data: materials, isLoading, error } = useQuery({
        queryKey: ["raw_material", selectedNode?.data.outputs.type],
        enabled: !!selectedNode?.data.outputs.type,
        queryFn: () => flowService.getRawMaterialForType(selectedNode?.data.outputs.type.toLowerCase() || ""),
    })
    const [searchTerm, setSearchTerm] = useState<string>("")

    const filteredScanners = useMemo(() => {
        if (!materials?.items || !selectedNode) return []
        if (!searchTerm.trim()) {
            return materials?.items
        }
        const term = searchTerm.toLowerCase()
        return materials?.items.filter((scanner: Scanner) => {
            return (
                scanner.class_name.toLowerCase().includes(term) ||
                scanner.name.toLowerCase().includes(term) ||
                scanner.module.toLowerCase().includes(term) ||
                scanner.inputs.type.toLowerCase().includes(term) ||
                scanner.outputs.type.toLowerCase().includes(term) ||
                (scanner.documentation && scanner.documentation.toLowerCase().includes(term))
            )
        })
    }, [searchTerm, materials?.items, selectedNode])

    const handleClick = useCallback((scanner: Scanner) => {
        if (!selectedNode) return
        const position = { x: selectedNode.position.x + 350, y: selectedNode.position.y }
        const newNode: FlowNode = {
            id: `${scanner.name}-${Date.now()}`,
            type: scanner.type === "type" ? "type" : "scanner",
            position,
            data: {
                id: scanner.id,
                class_name: scanner.class_name,
                module: scanner.module || "",
                key: scanner.name,
                color: colors[scanner.category.toLowerCase()] || "#94a3b8",
                name: scanner.name,
                category: scanner.category,
                type: scanner.type,
                inputs: scanner.inputs,
                outputs: scanner.outputs,
                documentation: scanner.documentation,
                description: scanner.description,
                required_params: scanner.required_params,
                params: scanner.params,
                params_schema: scanner.params_schema,
                icon: scanner.icon
            },
        }
        setNodes((prev) => ([...prev, newNode]))

        const connection: FlowEdge = {
            id: `${selectedNode.id}-${newNode.id}`,
            source: selectedNode.id,
            target: newNode.id,
            sourceHandle: selectedNode.data.outputs.type,
            targetHandle: scanner.inputs.type
        }
        setEdges((prev) => ([...prev, connection]))
        // onLayout && onLayout()
        setOpenFlowSheet(false)
    }, [selectedNode, setNodes, setEdges, onLayout, setOpenFlowSheet])

    return (
        <div>
            <Sheet open={openFlowSheet} onOpenChange={setOpenFlowSheet}>
                <SheetContent className="sm:max-w-xl">
                    <SheetHeader>
                        <SheetTitle>Add connector to <span className="text-primary">{selectedNode?.data.class_name}</span></SheetTitle>
                        <SheetDescription>Choose a transform to launch from the list below.</SheetDescription>
                    </SheetHeader>
                    <div className="p-4 grow overflow-auto border-t">
                        <Input
                            placeholder="Search transforms..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-4"
                        />

                        {isLoading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span className="ml-2">Loading transforms...</span>
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <TriangleAlert className="h-4 w-4" />
                                <AlertDescription>
                                    Failed to load transforms. Please try again.
                                </AlertDescription>
                            </Alert>
                        )}

                        {!isLoading && !error && (
                            <div className="flex flex-col gap-2">
                                {filteredScanners.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        {searchTerm.trim() ? 'No transforms found matching your search.' : 'No transforms available for this node type.'}
                                    </div>
                                ) : (
                                    filteredScanners.map((scanner: Scanner) => (
                                        <ScannerItem key={scanner.id} scanner={scanner} onClick={() => handleClick(scanner)} />
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}


export default FlowSheet

// Custom equality function for ScannerItem
function areEqual(prevProps: { scanner: Scanner }, nextProps: { scanner: Scanner }) {
    return (
        prevProps.scanner.class_name === nextProps.scanner.class_name &&
        prevProps.scanner.name === nextProps.scanner.name &&
        prevProps.scanner.module === nextProps.scanner.module &&
        prevProps.scanner.documentation === nextProps.scanner.documentation
    )
}

// Memoized scanner item component for the sidebar
const ScannerItem = memo(({ scanner, onClick }: { scanner: Scanner, onClick: () => void }) => {
    const colors = useNodesDisplaySettings(s => s.colors)
    const borderInputColor = colors[scanner.inputs.type.toLowerCase()]
    const borderOutputColor = colors[scanner.outputs.type.toLowerCase()]
    const Icon = scanner.type === "type" ? useIcon(scanner.outputs.type.toLowerCase() as string, null) : scanner.icon ? useIcon(scanner.icon, null) : null

    return (
        <TooltipProvider>
            <button
                onClick={onClick}
                className="p-3 rounded-md relative w-full overflow-hidden cursor-grab bg-card border ring-2 ring-transparent hover:ring-primary transition-all group"
                style={{ borderLeftWidth: "5px", borderRightWidth: "5px", borderLeftColor: borderInputColor ?? borderOutputColor, borderRightColor: borderOutputColor, cursor: "grab" }}
            >
                <div className="flex justify-between grow items-start">
                    <div className="flex items-start gap-2 grow truncate text-ellipsis">
                        <div className="space-y-1 truncate text-left">
                            <div className="flex items-center gap-2 truncate text-ellipsis">
                                {Icon && <Icon size={24} />}
                                <h3 className="text-sm font-medium truncate text-ellipsis">{scanner.class_name}</h3>
                            </div>
                            <p className="text-sm font-normal opacity-60 truncate text-ellipsis">{scanner.description}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Takes</span>
                                    <span className="font-bold truncate text-ellipsis">{scanner.inputs.type}</span>
                                </div>
                                <span><ArrowRight className="h-3 w-3" /></span>
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Returns</span>
                                    <span className="font-bold truncate text-ellipsis">{scanner.outputs.type}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {scanner.required_params &&
                    <div className="absolute bottom-3 right-3">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <TriangleAlert className="h-4 w-4 text-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>API key required</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>}
            </button>
        </TooltipProvider >
    )
}, areEqual)

ScannerItem.displayName = "ScannerItem"
