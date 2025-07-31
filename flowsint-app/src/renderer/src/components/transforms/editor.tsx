
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
import { Play, Pause, SkipForward, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import ScannerNode from "./scanner-node"
import TypeNode from "./type-node"
import { type ScannerNodeData } from "@/types/transform"
import { categoryColors } from "./scanner-data"
import { FlowControls } from "./controls"
import { getDagreLayoutedElements } from "@/lib/utils"
import { toast } from "sonner"
import { TransformModal } from "./save-modal"
import { useConfirm } from "@/components/use-confirm-dialog"
import { useParams, useRouter } from "@tanstack/react-router"
import { transformService } from "@/api/transfrom-service"
import { useTransformStore, type TransformNode, type TransformEdge } from "@/stores/transform-store"
import type { CSSProperties } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTheme } from "../theme-provider"
import ParamsDialog from "./params-dialog"
import TransformSheet from "./transform-sheet"
import ContextMenu from "./context-menu"

const nodeTypes: NodeTypes = {
    scanner: ScannerNode,
    type: TypeNode,
}

interface TransformEditorProps {
    theme?: ColorMode
    initialEdges: TransformEdge[]
    initialNodes: TransformNode[]
    transform?: any
}

const defaultEdgeStyle: CSSProperties = { stroke: "#64748b" }
const defaultMarkerEnd: EdgeMarker = {
    type: MarkerType.ArrowClosed,
    width: 15,
    height: 15,
    color: "#64748b",
}

const TransformEditorFlow = memo(({ initialEdges, initialNodes, theme, transform }: TransformEditorProps) => {
    // #### React Flow and UI State ####
    const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow()
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
    const router = useRouter()
    const { confirm } = useConfirm()
    const { transformId } = useParams({ strict: false })
    const [showModal, setShowModal] = useState(false)
    const hasInitialized = useRef(false)

    // #### Simulation State ####
    const [isSimulating, setIsSimulating] = useState(false)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [simulationSpeed, setSimulationSpeed] = useState(1000) // ms per step
    const [transformBranches, setTransformsBranches] = useState<any[]>([])

    // #### Transform Store State ####
    const nodes = useTransformStore(state => state.nodes)
    const edges = useTransformStore(state => state.edges)
    const loading = useTransformStore(state => state.loading)
    const setNodes = useTransformStore(state => state.setNodes)
    const setEdges = useTransformStore(state => state.setEdges)
    const onNodesChange = useTransformStore(state => state.onNodesChange)
    const onEdgesChange = useTransformStore(state => state.onEdgesChange)
    const onConnect = useTransformStore(state => state.onConnect)
    const setSelectedNode = useTransformStore(state => state.setSelectedNode)
    const setLoading = useTransformStore(state => state.setLoading)

    const [menu, setMenu] = useState<{
        node: TransformNode;
        top?: number;
        left?: number;
        right?: number;
        bottom?: number;
        rawTop?: number;
        rawLeft?: number;
        wrapperWidth: number;
        wrapperHeight: number;
        setMenu: (menu: any | null) => void;
    } | null>(null);

    // #### Initialization Effects ####
    // Initialize store with initial data
    useEffect(() => {
        if (!hasInitialized.current && (initialNodes.length > 0 || initialEdges.length > 0)) {
            setNodes(initialNodes)
            setEdges(initialEdges)
            hasInitialized.current = true
        }
    }, [initialNodes, initialEdges, setNodes, setEdges])

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            // Prevent native context menu from showing
            event.preventDefault();

            // Calculate position of the context menu. We want to make sure it
            // doesn't get positioned off-screen.
            if (!reactFlowWrapper.current) return;

            const pane = reactFlowWrapper.current.getBoundingClientRect();
            const relativeX = event.clientX - pane.left;
            const relativeY = event.clientY - pane.top;

            setMenu({
                node: node as TransformNode,
                rawTop: relativeY,
                rawLeft: relativeX,
                wrapperWidth: pane.width,
                wrapperHeight: pane.height,
                setMenu: setMenu,
            });
        },
        [setMenu],
    );

    // Center view on selected node
    // useEffect(() => {
    //     if (selectedNode && reactFlowInstance) {
    //         const nodeWidth = selectedNode.measured?.width ?? 0
    //         const nodeHeight = selectedNode.measured?.height ?? 0
    //         setCenter(
    //             selectedNode.position.x + nodeWidth / 2,
    //             selectedNode.position.y + nodeHeight / 2 + 20,
    //             { duration: 500, zoom: 1.5 }
    //         )
    //     }
    // }, [selectedNode, reactFlowInstance, setCenter])

    // #### Drag and Drop Handlers ####
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
            const newNode: TransformNode = {
                id: `${scannerData.name}-${Date.now()}`,
                type: scannerData.type === "type" ? "type" : "scanner",
                position,
                data: {
                    id: scannerData.id,
                    class_name: scannerData.class_name,
                    module: scannerData.module || "",
                    key: scannerData.name,
                    color: categoryColors[scannerData.category] || "#94a3b8",
                    name: scannerData.name,
                    category: scannerData.category,
                    type: scannerData.type,
                    inputs: scannerData.inputs,
                    outputs: scannerData.outputs,
                    documentation: scannerData.documentation,
                    description: scannerData.description,
                    required_params: scannerData.required_params,
                    params: scannerData.params,
                    params_schema: scannerData.params_schema,
                    icon: scannerData.icon
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

    // #### Node Interaction Handlers ####
    const onNodeClick: NodeMouseHandler = useCallback(
        (_: React.MouseEvent, node: Node) => {
            const typedNode = node as TransformNode
            setSelectedNode(typedNode)
            // const nodeWidth = typedNode.measured?.width ?? 0
            // const nodeHeight = typedNode.measured?.height ?? 0
            // setCenter(typedNode.position.x + nodeWidth / 2, typedNode.position.y + nodeHeight / 2 + 20, {
            //     duration: 500,
            //     zoom: 1.5,
            // })
        },
        [setCenter, setSelectedNode],
    )

    const onPaneClick = useCallback(() => {
        setSelectedNode(null)
        setMenu(null)
    }, [setSelectedNode, setMenu])

    // #### Layout and Node Management ####
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
                edges as TransformEdge[],
                { direction: "LR" }
            )
            setNodes(layouted.nodes as TransformNode[])
            setEdges(layouted.edges as TransformEdge[])
            window.requestAnimationFrame(() => {
                fitView()
            })
        }, 100)
    }, [nodes, edges, setNodes, setEdges, fitView])

    // #### Transform CRUD Operations ####
    const saveTransform = useCallback(
        async (name: string, description: string) => {
            setLoading(true)
            try {
                const inputType = nodes.find((node) => node.data.type === "type")?.data?.class_name
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

    const handleSaveTransform = useCallback(async () => {
        if (!transformId) {
            setShowModal(true)
        } else {
            await saveTransform(transform?.name || "", transform?.description || "")
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

    // #### Flow Computation ####
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

    // #### Simulation State Management ####
    // Update the updateNodeState function with proper types
    const updateNodeState = useCallback((nds: TransformNode[], nodeId: string, state: 'pending' | 'processing' | 'completed' | 'error') => {
        return nds.map((node) => {
            // focus on node
            if (node.id === nodeId) {
                const nodeWidth = node.measured?.width ?? 0
                const nodeHeight = node.measured?.height ?? 0
                setCenter(
                    node.position.x + nodeWidth / 2,
                    node.position.y + nodeHeight / 2 + 20,
                    { duration: 500, zoom: 1 }
                )
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
    }, [setCenter])

    // #### Simulation Effect ####
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
                setNodes((nds: TransformNode[]) => updateNodeState(nds, currentStep.nodeId, "processing"))

                // Update edges with proper types
                setEdges((eds: TransformEdge[]) => {
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
                    setNodes((nds: TransformNode[]) => updateNodeState(nds, currentStep.nodeId, "completed"))
                    setCurrentStepIndex((prev) => prev + 1)
                }, simulationSpeed)
            }
        } else {
            // End of simulation
            fitView({ duration: 500 })
            resetSimulation()
        }

        return () => clearTimeout(timer)
    }, [isSimulating, currentStepIndex, simulationSpeed, loading, transformBranches, updateNodeState, setCurrentStepIndex])

    // #### Simulation Control Functions ####
    const startSimulation = () => {
        // Reset all nodes to pending state
        setNodes((nds: TransformNode[]) =>
            nds.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    computationState: "pending",
                },
            }))
        )

        // Reset all edges
        setEdges((eds: TransformEdge[]) =>
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
        setNodes((nds: TransformNode[]) =>
            nds.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    computationState: "completed",
                },
            }))
        )

        // Reset edge styling
        setEdges((eds: TransformEdge[]) =>
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
        setNodes((nds: TransformNode[]) =>
            nds.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    computationState: undefined,
                },
            }))
        )

        // Reset all edges
        setEdges((eds: TransformEdge[]) =>
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

    // #### Render ####
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
                    onNodeContextMenu={onNodeContextMenu}
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
                                    <SelectItem value="750">Fast</SelectItem>
                                    <SelectItem value="400">Very fast</SelectItem>
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
                    <ParamsDialog />
                    {menu && <ContextMenu
                        {...menu}
                    >
                        <div>

                            fdff</div>
                    </ContextMenu>}
                    <MiniMap className="bg-background" position="bottom-left" pannable zoomable />

                </ReactFlow>
            </div>
            <TransformSheet onLayout={onLayout} />
            <TransformModal open={showModal} onOpenChange={setShowModal} onSave={saveTransform} isLoading={loading} />
        </>
    )
})

TransformEditor.displayName = "TransformEditor"

// #### Main Component ####
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
    })) as TransformEdge[]

    return (
        <ReactFlowProvider>
            <TransformEditorFlow
                transform={transform}
                initialEdges={enhancedEdges}
                initialNodes={initialNodes}
                theme={theme as ColorMode}
            />
        </ReactFlowProvider>
    )
}



export default TransformEditor
