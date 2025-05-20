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
import { X, Search, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import Loader from "../loader"
import ScannerNode, { type ScannerNodeData } from "./scanner-node"
import ScannerItem, { type Scanner } from "./scanner-item"
import { categoryColors } from "./scanner-data"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/resizable"
import { FlowControls } from "./controls"
import { getDagreLayoutedElements } from "@/lib/utils"
import { toast } from "sonner"
import { useParams, useRouter } from "next/navigation"
import { TransformModal } from "./save-modal"
import { useConfirm } from "../use-confirm-dialog"
import TestTransform from "./test-transform"
import { useLaunchTransform } from "@/hooks/use-launch-transform"
import { FlowComputationDrawer } from "./flow-computation-drawer"
import { clientFetch } from "@/lib/client-fetch"

const nodeTypes: NodeTypes = {
    scanner: ScannerNode,
}

const FlowEditor = memo(
    ({
        nodesData,
        initialEdges,
        initialNodes,
        theme,
        transform
    }: { nodesData: { items: any[] }; theme: any; initialEdges: Edge[]; initialNodes: Node[], transform?: any }) => {
        const { fitView, zoomIn, zoomOut, setCenter, getNode } = useReactFlow()
        const [nodes, setNodes, onNodesChange] = useNodesState<any>(initialNodes)
        const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<Record<string, unknown>>>(initialEdges)
        const [selectedNode, setSelectedNode] = useState<Node<any> | null>(null)
        const [loading, setLoading] = useState<boolean>(false)
        const [openTestTransform, setOpenTestTransform] = useState<boolean>(false)
        const [mounted, setMounted] = useState(false)
        const [searchTerm, setSearchTerm] = useState("")
        const [showModal, setShowModal] = useState(false)
        const reactFlowWrapper = useRef<HTMLDivElement>(null)
        const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
        const { launchTransform } = useLaunchTransform()
        const [inputType, setInputType] = useState(null)
        const router = useRouter()
        const { confirm } = useConfirm()
        const { transform_id } = useParams()
        const [showComputationDrawer, setShowComputationDrawer] = useState(false)

        useEffect(() => {
            const existsInput = nodes.find((node) => node.data.type === "type")
            setInputType(existsInput?.data?.outputs?.properties?.[0].name || null)
        }, [nodes, setInputType])

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
            (params) => {
                if (params.sourceHandle !== params.targetHandle)
                    return toast.error(`Canot connect ${params.sourceHandle} to ${params.targetHandle}`)
                const node = getNode(params.source)
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
                )
            },
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
                const scannerData = JSON.parse(event.dataTransfer.getData("application/json")) as ScannerNodeData & {
                    category: string
                }
                if (scannerData.type === "input") {
                    const existsInput = nodes.find((node) => node.data.type === "input")
                    if (existsInput) {
                        return toast.error("Only one input node is allowed")
                    }
                }
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
                const nodeWidth = newNode.measured?.width ?? 0
                const nodeHeight = newNode.measured?.height ?? 0
                setCenter(newNode.position.x + nodeWidth / 2, newNode.position.y + nodeHeight / 2 + 20, {
                    duration: 500,
                    zoom: 1.5,
                })
            },
            [reactFlowInstance, setNodes],
        )

        // Node selection handler
        const onNodeClick: NodeMouseHandler = useCallback(
            (_, node) => {
                setSelectedNode(node as Node<ScannerNodeData>)
                const nodeWidth = node.measured?.width ?? 0
                const nodeHeight = node.measured?.height ?? 0
                setCenter(node.position.x + nodeWidth / 2, node.position.y + nodeHeight / 2 + 20, {
                    duration: 500,
                    zoom: 1.5,
                })
            },
            [setCenter, setSelectedNode],
        )

        const onPaneClick = useCallback(() => {
            setSelectedNode(null)
        }, [])

        const onLayout = useCallback(() => {
            const { nodes: newNodes, edges: newEdges } = getDagreLayoutedElements(nodes, edges, { direction: "LR" })
            setNodes(newNodes)
            setEdges(newEdges as Edge<Record<string, unknown>>[])
            window.requestAnimationFrame(() => {
                fitView()
            })
        }, [nodes, edges, setNodes, setEdges, fitView])

        const handleDeleteNode = useCallback(() => {
            if (selectedNode) {
                setNodes((nodes) => nodes.filter((node) => node.id !== selectedNode.id))
                setEdges((edges: Edge[]) =>
                    edges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id),
                )
                setSelectedNode(null)
            }
        }, [selectedNode, setNodes, setEdges])

        const saveTransform = useCallback(
            async (name: string, description: string) => {
                setLoading(true)
                try {
                    let newTransform
                    const body = JSON.stringify({
                        name: name,
                        description: description,
                        category: [inputType],
                        transform_schema: {
                            nodes,
                            edges,
                        },
                    })
                    if (transform_id) {
                        newTransform = await clientFetch(`${process.env.NEXT_PUBLIC_FLOWSINT_API}/transforms/${transform_id}`,
                            { method: "PUT", body: body }
                        )
                    } else {
                        newTransform = await clientFetch(`${process.env.NEXT_PUBLIC_FLOWSINT_API}/transforms/create`,
                            { method: "POST", body: body }
                        )
                        if (!newTransform) {
                            toast.error("Error creating transform")
                            return
                        }
                    }
                    toast.success("Transform saved successfully.")
                    newTransform && !transform_id && router.push(`/dashboard/transforms/${newTransform.id}`)
                } catch (error) {
                    toast.error("Error saving transform" + JSON.stringify(error))
                } finally {
                    setLoading(false)
                    setShowModal(false)
                }
            },
            [nodes, edges, transform_id, router, inputType],
        )

        const handleSaveTransform = useCallback(() => {
            if (!inputType) return toast.error("Make sure your transform contains an input type.")
            if (!transform_id) {
                setShowModal(true)
            } else {
                saveTransform("", "")
            }
        }, [transform_id, saveTransform, inputType])

        const handleTestTransform = useCallback(
            async (data: any) => {
                if (!transform_id) {
                    toast.error("Save the transform first.")
                    return
                }
                launchTransform([data.domain], transform_id as string, null)
            },
            [transform_id, launchTransform],
        )

        const handleDeleteTransform = useCallback(async () => {
            if (!transform_id) return
            if (
                await confirm({
                    title: "Are you sure you want to delete this simulation?",
                    message: "This action is irreversible.",
                })
            ) {
                setLoading(true)
                // TODO
            }
        }, [transform_id, confirm, router])

        const handleComputeFlow = useCallback(() => {
            if (!transform_id) {
                toast.error("Save the transform first to compute the flow.")
                return
            }
            setShowComputationDrawer(true)
        }, [transform_id])

        if (!mounted) {
            return <Loader label="Loading..." />
        }

        return (
            <>
                <ResizablePanelGroup
                    autoSaveId="persistence"
                    direction="horizontal"
                    className="w-screen grow relative overflow-hidden"
                >
                    <ResizablePanel defaultSize={20}>
                        <div className="h-[calc(100vh_-_52px)] bg-card p-4 overflow-y-auto">
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
                                                    color={categoryColors[category] || categoryColors[scanner.type] || "#94a3b8"}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(filteredScanners).length === 0 && (
                                    <div className="text-center py-4 text-muted-foreground">
                                        No scanners found matching "{searchTerm}"
                                    </div>
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
                                <FlowControls
                                    loading={loading}
                                    transform={transform}
                                    handleSaveTransform={handleSaveTransform}
                                    handleDeleteTransform={handleDeleteTransform}
                                    handleComputeFlow={handleComputeFlow}
                                    setOpenTestTransform={setOpenTestTransform}
                                    onLayout={onLayout}
                                    fitView={fitView}
                                    zoomIn={zoomIn}
                                    zoomOut={zoomOut}
                                    isSaved={Boolean(transform_id)}
                                />
                                <Background bgColor="var(--background)" />
                                {selectedNode && (
                                    <Panel position="bottom-right" className="bg-card p-3 rounded-md shadow-md border w-72">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-medium">{selectedNode.data.class_name}</h3>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDeleteNode}>
                                                <TrashIcon className="h-4 w-4" />
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
                    <TransformModal open={showModal} onOpenChange={setShowModal} onSave={saveTransform} isLoading={loading} />
                </ResizablePanelGroup>
                {inputType && (
                    <TestTransform
                        loading={loading}
                        type={inputType}
                        onSubmit={handleTestTransform}
                        setOpen={setOpenTestTransform}
                        open={openTestTransform}
                    />
                )}
                <FlowComputationDrawer
                    transformId={transform_id as string}
                    open={showComputationDrawer}
                    onOpenChange={setShowComputationDrawer}
                    nodes={nodes}
                    edges={edges}
                    inputType={inputType}
                />
            </>
        )
    },
)

FlowEditor.displayName = "FlowEditor"

function TransformEditor({
    nodesData,
    initialEdges = [],
    initialNodes = [],
    transform
}: { nodesData: { items: any[] }; initialEdges?: Edge[]; initialNodes?: Node[], transform?: any }) {
    const [mounted, setMounted] = useState(false)
    const { resolvedTheme } = useTheme()

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <Loader label="Loading.." />
    }
    return (
        <ReactFlowProvider>
            <FlowEditor
                transform={transform}
                nodesData={nodesData}
                initialEdges={initialEdges}
                initialNodes={initialNodes}
                theme={resolvedTheme || "light"}
            />
        </ReactFlowProvider>
    )
}

export default memo(TransformEditor)
