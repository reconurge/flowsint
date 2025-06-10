import { useCallback, useState } from "react"
import {
    ReactFlow,
    Background,
    MiniMap,
    Node,
    Connection,
    addEdge,
    useNodesState,
    useEdgesState,
    useReactFlow,
    ReactFlowProvider
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useWallStore } from "@/stores/wall-store"
import CustomNode from "./base-node";
import { FlowControls } from "./controls"
import { useTheme } from "../theme-provider"

const nodeTypes = {
    custom: CustomNode,
};

function FlowContent() {
    const [loading, setLoading] = useState(false)
    const reactFlowInstance = useReactFlow()
    const initialNodes = useWallStore(s => s.nodes)
    const initialEdges = useWallStore(s => s.edges)
    const onNodesChange = useWallStore(s => s.onNodesChange)
    const onEdgesChange = useWallStore(s => s.onEdgesChange)
    const onConnect = useWallStore(s => s.onConnect)
    const setCurrentNode = useWallStore(s => s.setCurrentNode)
    const setSelectedNodes = useWallStore(s => s.setSelectedNodes)
    const saveWall = useWallStore(s => s.saveWall)
    const deleteWall = useWallStore(s => s.deleteWall)

    const { theme } = useTheme()

    const [nodes, setNodes, onNodesChangeLocal] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChangeLocal] = useEdgesState(initialEdges)

    const handleSaveWall = useCallback(async () => {
        setLoading(true)
        try {
            await saveWall(nodes, edges)
        } catch (error) {
            console.error('Failed to save wall:', error)
        } finally {
            setLoading(false)
        }
    }, [nodes, edges, saveWall])

    const handleDeleteWall = useCallback(async () => {
        setLoading(true)
        try {
            await deleteWall()
        } catch (error) {
            console.error('Failed to delete wall:', error)
        } finally {
            setLoading(false)
        }
    }, [deleteWall])

    const onLayout = useCallback(() => {
        if (!reactFlowInstance) return
        const { fitView } = reactFlowInstance
        // You can implement your own layout logic here
        // For now, we'll just fit the view
        fitView({ duration: 800 })
    }, [reactFlowInstance])

    const handleNodesChange = useCallback(
        (changes: any) => {
            onNodesChangeLocal(changes)
            onNodesChange(changes)
        },
        [onNodesChangeLocal, onNodesChange]
    )

    const handleEdgesChange = useCallback(
        (changes: any) => {
            onEdgesChangeLocal(changes)
            onEdgesChange(changes)
        },
        [onEdgesChangeLocal, onEdgesChange]
    )

    const handleConnect = useCallback(
        (connection: Connection) => {
            setEdges((eds) => addEdge(connection, eds))
            onConnect(connection)
        },
        [setEdges, onConnect]
    )

    const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
    }, [])

    const onDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault()

            const reactFlowBounds = event.currentTarget.getBoundingClientRect()
            const data = JSON.parse(event.dataTransfer.getData("text/plain"))

            const position = {
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            }

            const newNode: Node = {
                id: `${data.type}-${Date.now()}`,
                type: "custom",
                position,
                data: { ...data },
            }

            setNodes((nds) => nds.concat(newNode))
            onNodesChange([{ type: "add", item: newNode }])
            setCurrentNode(newNode)
        },
        [setNodes, onNodesChange, setCurrentNode]
    )

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            setCurrentNode(node)
        },
        [setCurrentNode]
    )

    const onSelectionChange = useCallback(
        ({ nodes }: { nodes: Node[] }) => {
            setSelectedNodes(nodes)
        },
        [setSelectedNodes]
    )

    const onPaneClick = useCallback(
        () => {
            setCurrentNode(null)
            setSelectedNodes([])
        },
        [setCurrentNode, setSelectedNodes]
    )

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-1 w-full h-full bg-background">
                <ReactFlow
                    nodes={nodes}
                    proOptions={{ hideAttribution: true }}
                    edges={edges}
                    colorMode={theme}
                    nodeTypes={nodeTypes}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={handleEdgesChange}
                    onConnect={handleConnect}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    onSelectionChange={onSelectionChange}
                    fitView
                >
                    <Background bgColor="var(--background)" />
                    <FlowControls
                        loading={loading}
                        handleSaveWall={handleSaveWall}
                        handleDeleteWall={handleDeleteWall}
                        onLayout={onLayout}
                        fitView={() => reactFlowInstance?.fitView({ duration: 800 })}
                        zoomIn={() => reactFlowInstance?.zoomIn({ duration: 800 })}
                        zoomOut={() => reactFlowInstance?.zoomOut({ duration: 800 })}
                        isSaved={true}
                    />
                    <MiniMap position="bottom-left" />
                </ReactFlow>
            </div>
        </div>
    )
}

export default function InvestigationsWall() {
    return (
        <ReactFlowProvider>
            <FlowContent />
        </ReactFlowProvider>
    )
} 