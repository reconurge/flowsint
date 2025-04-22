"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect, memo, useMemo } from "react"
import {
    ReactFlow,
    ReactFlowProvider,
    Panel,
    Background,
    type NodeTypes,
    useNodesState,
    useEdgesState,
    addEdge,
    type Edge,
    MarkerType,
    type Node,
    type OnConnect,
    type NodeMouseHandler,
    useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Input } from "@/components/ui/input"
import { X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import Loader from "../loader"
import ScannerNode, { type ScannerNodeData } from "./scanner-node"
import ScannerItem, { type Scanner } from "./scanner-item"
import { categoryColors } from "./scanner-data"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/resizable"
import { FlowControls } from "./controls"
import { getDagreLayoutedElements } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useParams, useRouter } from "next/navigation"

const nodeTypes: NodeTypes = {
    scanner: ScannerNode,
}

const FlowEditor = memo(({ nodesData, initialEdges, initialNodes, theme }: { nodesData: { items: any[] }, theme: any, initialEdges: Edge[], initialNodes: Node[] }) => {
    const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow()
    const [nodes, setNodes, onNodesChange] = useNodesState<any>(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<Record<string, unknown>>>(initialEdges)
    const [selectedNode, setSelectedNode] = useState<Node<any> | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [mounted, setMounted] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
    const router = useRouter()
    const { transform_id } = useParams()

    useEffect(() => {
        setMounted(true)
    }, [])

    // Filter scanners based on search term
    const filteredScanners = useMemo(() => {
        const result: Record<string, Scanner[]> = {}
        if (!searchTerm.trim()) {
            return nodesData.items
        }
        const term = searchTerm.toLowerCase()

        Object.entries(nodesData.items).forEach(([category, items]) => {
            const filtered = items.filter(
                (item: any) =>
                    item.name.toLowerCase().includes(term) ||
                    item.class_name.toLowerCase().includes(term) ||
                    (item.doc && item.doc.toLowerCase().includes(term)),
            )

            if (filtered.length > 0) {
                result[category] = filtered
            }
        })

        return result
    }, [searchTerm])

    // Connection handler
    const onConnect: OnConnect = useCallback(
        (params) =>
            setEdges((eds) =>
                addEdge(
                    {
                        ...params,
                        animated: true,
                        style: { stroke: "#64748b" },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            width: 15,
                            height: 15,
                            color: "#64748b",
                        },
                    },
                    eds,
                ),
            ),
        [setEdges],
    )

    const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
    }, [])

    const onDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            if (!reactFlowWrapper.current || !reactFlowInstance) return
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
            const scannerData = JSON.parse(event.dataTransfer.getData("application/json")) as Scanner & { category: string }
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            })
            const newNode: Node<ScannerNodeData> = {
                id: `${scannerData.name}-${Date.now()}`,
                type: "scanner",
                position,
                data: {
                    ...scannerData,
                    color: categoryColors[scannerData.category] || "#94a3b8",
                },
            }
            setNodes((nds) => nds.concat(newNode))
        },
        [reactFlowInstance, setNodes],
    )

    // Node selection handler
    const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
        setSelectedNode(node as Node<ScannerNodeData>)
        const nodeWidth = node.measured?.width ?? 0;
        const nodeHeight = node.measured?.height ?? 0;
        setCenter(
            node.position.x + nodeWidth / 2,
            node.position.y + nodeHeight / 2 + 20,
            {
                duration: 500,
                zoom: 1.5,
            }
        );
    }, [setCenter, setSelectedNode])

    // Background click handler (deselection)
    const onPaneClick = useCallback(() => {
        setSelectedNode(null)
    }, [])
    const onLayout = useCallback(() => {
        const { nodes: newNodes, edges: newEdges } = getDagreLayoutedElements(nodes, edges, { direction: "LR" });
        setNodes(newNodes);
        setEdges(newEdges as Edge<Record<string, unknown>>[]);
        window.requestAnimationFrame(() => {
            fitView();
        });
    }, [nodes, edges, setNodes, setEdges, fitView, getDagreLayoutedElements]);

    // Node deletion handler
    const handleDeleteNode = useCallback(() => {
        if (selectedNode) {
            setNodes((nodes) => nodes.filter((node) => node.id !== selectedNode.id))
            setEdges((edges: Edge[]) =>
                edges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id),
            )
            setSelectedNode(null)
        }
    }, [selectedNode, setNodes, setEdges])

    const handleSaveSimulation = useCallback(async () => {
        setLoading(true)
        try {
            const { data: newTransfrorm } = await supabase.from("transforms").upsert({
                id: transform_id,
                name: "My Simulation",
                transform_schema: {
                    nodes, edges
                }
            }).select("id").single()
            toast.success("Simulation saved successfully.")
            newTransfrorm && !transform_id && router.push(`/dashboard/transforms/${newTransfrorm.id}`)
        } catch (error) {
            toast.error("Error saving simulation")
        } finally {
            setLoading(false)
        }
    }, [setLoading, router, nodes, edges])

    if (!mounted) {
        return (
            <div className="grow w-full flex items-center justify-center">
                <Loader /> Loading...
            </div>
        )
    }

    return (
        <ResizablePanelGroup autoSaveId="persistence" direction="horizontal" className="w-screen grow relative overflow-hidden">
            <ResizablePanel defaultSize={20} className="h-full bg-card p-4 overflow-y-auto">
                <div className="h-full">
                    <div className="relative mb-4">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search scanners..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1.5 h-6 w-6"
                                onClick={() => setSearchTerm("")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="space-y-4">
                        {Object.entries(filteredScanners).map(([category, scanners]) => (
                            <div key={category} className="space-y-2">
                                <h3 className="text-sm font-medium capitalize pb-1">{category.replace("_", " ")}</h3>
                                <div className="space-y-2">
                                    {scanners.map((scanner: Scanner) => (
                                        <ScannerItem
                                            key={scanner.name}
                                            scanner={scanner}
                                            category={category}
                                            color={categoryColors[category] || "#94a3b8"}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                        {Object.keys(filteredScanners).length === 0 && (
                            <div className="text-center py-4 text-muted-foreground">No scanners found matching "{searchTerm}"</div>
                        )}
                    </div>
                </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel>
                <div ref={reactFlowWrapper} className="w-full h-full bg-background">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        fitView
                        proOptions={{ hideAttribution: true }}
                        colorMode={theme}
                    >
                        <FlowControls loading={loading} handleSaveSimulation={handleSaveSimulation} onLayout={onLayout} fitView={fitView} zoomIn={zoomIn} zoomOut={zoomOut} />
                        <Background bgColor="var(--background)" />
                        {/* Selected node information panel */}
                        {selectedNode && (
                            <Panel position="bottom-right" className="bg-card p-3 rounded-md shadow-md border w-72">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-medium">{selectedNode.data.class_name}</h3>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDeleteNode}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="text-sm space-y-2">
                                    <p>
                                        <span className="font-medium">Module:</span> {selectedNode.data.module}
                                    </p>
                                    <p>
                                        <span className="font-medium">Key:</span> {selectedNode.data.key}
                                    </p>
                                    {selectedNode.data.doc && (
                                        <p>
                                            <span className="font-medium">Description:</span> {selectedNode.data.doc}
                                        </p>
                                    )}
                                </div>
                            </Panel>
                        )}
                    </ReactFlow>
                </div>
            </ResizablePanel>
        </ResizablePanelGroup >
    )
})

FlowEditor.displayName = "FlowEditor"

function TransformEditor({ nodesData, initialEdges = [], initialNodes = [] }: { nodesData: { items: any[] }, initialEdges?: Edge[], initialNodes?: Node[] }) {
    const [mounted, setMounted] = useState(false);
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="grow w-full flex items-center justify-center">
                <Loader /> Loading...
            </div>
        );
    }

    return (
        <ReactFlowProvider>
            <FlowEditor nodesData={nodesData} initialEdges={initialEdges} initialNodes={initialNodes} theme={resolvedTheme || "light"} />
        </ReactFlowProvider>
    );
}

export default memo(TransformEditor);