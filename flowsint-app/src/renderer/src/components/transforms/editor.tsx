"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect, memo } from "react"
import {
    ReactFlow,
    ReactFlowProvider,
    Panel,
    Background,
    type NodeTypes,
    type Node,
    useReactFlow,
    type NodeMouseHandler,
    type ColorMode,
    MarkerType,
    type EdgeMarker,
    MiniMap,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { TrashIcon, Play, Pause, SkipForward, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import ScannerNode, { type ScannerNodeData } from "./scanner-node"
import { categoryColors } from "./scanner-data"
import { FlowControls } from "./controls"
import { getDagreLayoutedElements } from "@/lib/utils"
import { toast } from "sonner"
import { TransformModal } from "./save-modal"
import { useConfirm } from "@/components/use-confirm-dialog"
import { useParams, useRouter } from "@tanstack/react-router"
import { transformService } from "@/api/transfrom-service"
import { useFlowStore, type FlowNode, type FlowEdge } from "@/stores/flow-store"
import type { CSSProperties } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTheme } from "../theme-provider"

const nodeTypes: NodeTypes = {
    scanner: ScannerNode,
}

interface FlowEditorProps {
    theme: ColorMode
    initialEdges: FlowEdge[]
    initialNodes: FlowNode[]
    transform?: any
}

interface TransformEditorProps {
    initialEdges?: FlowEdge[]
    initialNodes?: FlowNode[]
    transform?: any
}

const defaultEdgeStyle: CSSProperties = { stroke: "#64748b" }
const defaultMarkerEnd: EdgeMarker = {
    type: MarkerType.ArrowClosed,
    width: 15,
    height: 15,
    color: "#64748b",
}

const FlowEditor = memo(({ initialEdges, initialNodes, theme, transform }: FlowEditorProps) => {
    const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow()
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
    const router = useRouter()
    const { confirm } = useConfirm()
    const { transformId } = useParams({ strict: false })
    const [showModal, setShowModal] = useState(false)
    const hasInitialized = useRef(false)
    const [isSimulating, setIsSimulating] = useState(false)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [simulationSpeed, setSimulationSpeed] = useState(1000) // ms per step
    const [transformBranches, setTransformsBranches] = useState<any[]>([])

    const nodes = useFlowStore(state => state.nodes)
    const edges = useFlowStore(state => state.edges)
    const selectedNode = useFlowStore(state => state.selectedNode)
    const loading = useFlowStore(state => state.loading)
    const setNodes = useFlowStore(state => state.setNodes)
    const setEdges = useFlowStore(state => state.setEdges)
    const onNodesChange = useFlowStore(state => state.onNodesChange)
    const onEdgesChange = useFlowStore(state => state.onEdgesChange)
    const onConnect = useFlowStore(state => state.onConnect)
    const setSelectedNode = useFlowStore(state => state.setSelectedNode)
    const setLoading = useFlowStore(state => state.setLoading)
    const deleteNode = useFlowStore(state => state.deleteNode)

    // Initialize store with initial data
    useEffect(() => {
        if (!hasInitialized.current && (initialNodes.length > 0 || initialEdges.length > 0)) {
            setNodes(initialNodes)
            setEdges(initialEdges)
            hasInitialized.current = true
        }
    }, [initialNodes, initialEdges, setNodes, setEdges])

    // Center view on selected node
    useEffect(() => {
        if (selectedNode && reactFlowInstance) {
            const nodeWidth = selectedNode.measured?.width ?? 0
            const nodeHeight = selectedNode.measured?.height ?? 0
            setCenter(
                selectedNode.position.x + nodeWidth / 2,
                selectedNode.position.y + nodeHeight / 2 + 20,
                { duration: 500, zoom: 1.5 }
            )
        }
    }, [selectedNode, reactFlowInstance, setCenter])

    const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
    }, [])

    const onDrop = useCallback(
        //@ts-ignore
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
            if (scannerData.type === "type") {
                const existsType = nodes.find((node) => node.data.type === "type")
                if (existsType) {
                    return toast.error("Only one type node is allowed")
                }
            }
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            })
            const newNode: FlowNode = {
                id: `${scannerData.name}-${Date.now()}`,
                type: "scanner",
                position,
                data: {
                    class_name: scannerData.name,
                    module: scannerData.module || "",
                    key: scannerData.name,
                    color: categoryColors[scannerData.category] || "#94a3b8",
                    name: scannerData.name,
                    category: scannerData.category,
                    type: scannerData.type,
                    inputs: scannerData.inputs,
                    outputs: scannerData.outputs,
                    doc: scannerData.doc,
                },
            }
            const updatedNodes = [...nodes, newNode]
            setNodes(updatedNodes)
            const nodeWidth = newNode.measured?.width ?? 0
            const nodeHeight = newNode.measured?.height ?? 0
            setCenter(newNode.position.x + nodeWidth / 2, newNode.position.y + nodeHeight / 2 + 20, {
                duration: 500,
                zoom: 1.5,
            })
        },
        [reactFlowInstance, nodes, setNodes, setCenter],
    )

    const onNodeClick: NodeMouseHandler = useCallback(
        (_: React.MouseEvent, node: Node) => {
            const typedNode = node as FlowNode
            setSelectedNode(typedNode)
            const nodeWidth = typedNode.measured?.width ?? 0
            const nodeHeight = typedNode.measured?.height ?? 0
            setCenter(typedNode.position.x + nodeWidth / 2, typedNode.position.y + nodeHeight / 2 + 20, {
                duration: 500,
                zoom: 1.5,
            })
        },
        [setCenter, setSelectedNode],
    )

    const onPaneClick = useCallback(() => {
        setSelectedNode(null)
    }, [setSelectedNode])

    const onLayout = useCallback(() => {
        // Wait for nodes to be measured before running layout
        setTimeout(() => {
            const layouted = getDagreLayoutedElements(
                nodes.map(node => ({
                    ...node,
                    measured: {
                        width: node.measured?.width ?? 150,
                        height: node.measured?.height ?? 40
                    },
                    data: {
                        ...node.data,
                        key: node.data.class_name || node.id,
                    },
                })),
                edges as FlowEdge[],
                { direction: "LR" }
            )
            setNodes(layouted.nodes as FlowNode[])
            setEdges(layouted.edges as FlowEdge[])
            window.requestAnimationFrame(() => {
                fitView()
            })
        }, 100)
    }, [nodes, edges, setNodes, setEdges, fitView])

    const handleDeleteNode = useCallback(() => {
        if (selectedNode) {
            deleteNode(selectedNode.id)
        }
    }, [selectedNode, deleteNode])

    const saveTransform = useCallback(
        async (name: string, description: string) => {
            setLoading(true)
            try {
                const inputType = nodes.find((node) => node.data.type === "type")?.data?.class_name
                console.log(nodes)
                if (!inputType) {
                    toast.error("Make sure your transform contains an input type.")
                    return
                }
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
                if (transformId) {
                    newTransform = await transformService.update(transformId, body)
                } else {
                    newTransform = await transformService.create(body)
                    if (!newTransform) {
                        toast.error("Error creating transform")
                        return
                    }
                }
                toast.success("Transform saved successfully.")
                newTransform && !transformId && router.navigate({ to: `/dashboard/transforms/${newTransform.id}` })
            } catch (error) {
                toast.error("Error saving transform" + JSON.stringify(error))
            } finally {
                setLoading(false)
                setShowModal(false)
            }
        },
        [nodes, edges, transformId, router, setLoading],
    )

    const handleSaveTransform = useCallback(() => {
        if (!transformId) {
            setShowModal(true)
        } else {
            saveTransform(transform?.name || "", transform?.description || "")
        }
    }, [transformId, saveTransform, transform])

    const handleDeleteTransform = useCallback(async () => {
        if (!transformId) return
        if (
            await confirm({
                title: "Are you sure you want to delete this simulation?",
                message: "This action is irreversible.",
            })
        ) {
            setLoading(true)
            await transformService.delete(transformId)
            router.navigate({ to: "/dashboard/transforms" })
            toast.success("Transform deleted successfully.")
            setLoading(false)
        }
    }, [transformId, confirm, setLoading])

    const handleComputeFlow = useCallback(async () => {
        if (!transformId) {
            toast.error("Save the transform first to compute the flow.")
            return
        }

        setLoading(true)
        try {
            const body = {
                nodes,
                edges,
                initialValue: "domain"
            }
            const response = await transformService.compute(transformId, JSON.stringify(body))
            setTransformsBranches(response.transformBranches)
            startSimulation()
        } catch (error) {
            toast.error("Error computing flow")
        } finally {
            setLoading(false)
        }
    }, [transformId, nodes, edges])

    // Update the updateNodeState function with proper types
    const updateNodeState = useCallback((nds: FlowNode[], nodeId: string, state: 'pending' | 'processing' | 'completed' | 'error') => {
        return nds.map((node) => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        computationState: state,
                    },
                }
            }
            return node
        })
    }, [])

    // In the simulation effect
    useEffect(() => {
        if (!isSimulating || loading) return

        let timer: NodeJS.Timeout

        const totalSteps = transformBranches.reduce((sum, branch) => sum + branch.steps.length, 0)

        if (currentStepIndex < totalSteps) {
            // Find the current branch and step
            let stepFound = false
            let branchIndex = 0
            let stepIndex = 0
            let currentStepCount = 0

            for (let i = 0; i < transformBranches.length; i++) {
                const branch = transformBranches[i]
                if (currentStepCount + branch.steps.length > currentStepIndex) {
                    branchIndex = i
                    stepIndex = currentStepIndex - currentStepCount
                    stepFound = true
                    break
                }
                currentStepCount += branch.steps.length
            }

            if (stepFound) {
                const currentStep = transformBranches[branchIndex].steps[stepIndex]

                // Update node states with proper types
                setNodes((nds: FlowNode[]) => updateNodeState(nds, currentStep.nodeId, "processing"))

                // Update edges with proper types
                setEdges((eds: FlowEdge[]) => {
                    return eds.map((edge) => ({
                        ...edge,
                        style: {
                            ...edge.style,
                            stroke: edge.source === currentStep.nodeId || edge.target === currentStep.nodeId ? "#3b82f6" : "#64748b",
                            strokeWidth: edge.source === currentStep.nodeId || edge.target === currentStep.nodeId ? 2 : 1,
                        },
                        animated: edge.source === currentStep.nodeId || edge.target === currentStep.nodeId,
                    }))
                })

                // After delay, mark as completed and move to next step
                timer = setTimeout(() => {
                    setNodes((nds: FlowNode[]) => updateNodeState(nds, currentStep.nodeId, "completed"))
                    setCurrentStepIndex((prev) => prev + 1)
                }, simulationSpeed)
            }
        } else {
            // End of simulation
            setIsSimulating(false)
        }

        return () => clearTimeout(timer)
    }, [isSimulating, currentStepIndex, simulationSpeed, loading, transformBranches, updateNodeState])

    const startSimulation = () => {
        // Reset all nodes to pending state
        setNodes((nds: FlowNode[]) =>
            nds.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    computationState: "pending",
                },
            }))
        )

        // Reset all edges
        setEdges((eds: FlowEdge[]) =>
            eds.map((edge) => ({
                ...edge,
                style: {
                    ...edge.style,
                    stroke: "#64748b",
                    strokeWidth: 1,
                },
                animated: false,
            }))
        )

        setCurrentStepIndex(0)
        setIsSimulating(true)
    }

    const pauseSimulation = () => {
        setIsSimulating(false)
    }

    const skipToEnd = () => {
        setIsSimulating(false)

        // Mark all nodes as completed
        setNodes((nds: FlowNode[]) =>
            nds.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    computationState: "completed",
                },
            }))
        )

        // Reset edge styling
        setEdges((eds: FlowEdge[]) =>
            eds.map((edge) => ({
                ...edge,
                style: {
                    ...edge.style,
                    stroke: "#64748b",
                    strokeWidth: 1,
                },
                animated: false,
            }))
        )

        const totalSteps = transformBranches.reduce((sum, branch) => sum + branch.steps.length, 0)
        setCurrentStepIndex(totalSteps)
    }

    const resetSimulation = () => {
        setIsSimulating(false)
        setCurrentStepIndex(0)

        // Reset all nodes
        setNodes((nds: FlowNode[]) =>
            nds.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    computationState: undefined,
                },
            }))
        )

        // Reset all edges
        setEdges((eds: FlowEdge[]) =>
            eds.map((edge) => ({
                ...edge,
                style: {
                    ...edge.style,
                    stroke: "#64748b",
                    strokeWidth: 1,
                },
                animated: false,
            }))
        )
    }

    return (
        <>
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
                    {transformId &&
                        <Panel position="top-right" className="space-x-2 mt-14 mr-2 z-50 flex items-center">
                            {isSimulating ? (
                                <Button size="sm" variant="outline" className="h-7" onClick={pauseSimulation}>
                                    <Pause className="h-4 w-4 mr-1" /> Pause
                                </Button>
                            ) : (
                                <Button size="sm" variant="default" className="h-7" onClick={handleComputeFlow}>
                                    <Play className="h-4 w-4 mr-1" /> Compute
                                </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7" onClick={skipToEnd}>
                                <SkipForward className="h-4 w-4 mr-1" /> Skip
                            </Button>
                            <Button size="sm" variant="outline" className="h-7" onClick={resetSimulation}>
                                <RefreshCw className="h-4 w-4 mr-1" /> Reset
                            </Button>
                            <Select
                                value={String(simulationSpeed)}
                                onValueChange={(value) => setSimulationSpeed(Number(value))}
                            >
                                <SelectTrigger className="!h-7">
                                    <SelectValue placeholder="Select speed" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2000">Slow</SelectItem>
                                    <SelectItem value="1000">Normal</SelectItem>
                                    <SelectItem value="500">Fast</SelectItem>
                                    <SelectItem value="100">Very Fast</SelectItem>
                                </SelectContent>
                            </Select>
                        </Panel>}
                    <FlowControls
                        loading={loading}
                        transform={transform}
                        handleSaveTransform={handleSaveTransform}
                        handleDeleteTransform={handleDeleteTransform}
                        onLayout={onLayout}
                        fitView={fitView}
                        zoomIn={zoomIn}
                        zoomOut={zoomOut}
                        isSaved={Boolean(transformId)}
                    />
                    <Background bgColor="var(--background)" />
                    <MiniMap className="bg-background" position="bottom-left" pannable zoomable />
                    {selectedNode && (
                        <NodePanel node={selectedNode} onDelete={handleDeleteNode} />
                    )}
                </ReactFlow>
            </div>
            <TransformModal open={showModal} onOpenChange={setShowModal} onSave={saveTransform} isLoading={loading} />
        </>
    )
})

FlowEditor.displayName = "FlowEditor"

function TransformEditor({
    initialEdges = [],
    initialNodes = [],
    transform
}: TransformEditorProps) {
    const { theme } = useTheme()

    // Transform any plain edges into edges with required properties
    const enhancedEdges = initialEdges.map(edge => ({
        ...edge,
        animated: true,
        style: defaultEdgeStyle,
        markerEnd: defaultMarkerEnd
    })) as FlowEdge[]

    return (
        <ReactFlowProvider>
            <FlowEditor
                transform={transform}
                initialEdges={enhancedEdges}
                initialNodes={initialNodes}
                theme={theme as ColorMode}
            />
        </ReactFlowProvider>
    )
}

// Update the NodePanel type
const NodePanel = memo(({ node, onDelete }: { node: FlowNode; onDelete: () => void }) => (
    <Panel position="bottom-right" className="bg-card p-3 rounded-md shadow-md border w-72">
        <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium">{node.data.class_name}</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
                <TrashIcon className="h-4 w-4" />
            </Button>
        </div>
        <div className="text-sm space-y-2">
            <p>
                <span className="font-medium">Module:</span> {node.data.module}
            </p>
            <p>
                <span className="font-medium">Key:</span> {node.data.key}
            </p>
            {node.data.doc && (
                <p>
                    <span className="font-medium">Description:</span> {node.data.doc}
                </p>
            )}
        </div>
    </Panel>
))

NodePanel.displayName = "NodePanel"

export default TransformEditor
