"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect, memo, useMemo } from "react"
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    type Node,
    useReactFlow,
    type NodeMouseHandler,
    type ColorMode,
    MiniMap,
    BackgroundVariant,
    // EdgeTypes,
    MarkerType,
    EdgeTypes,
    ConnectionMode,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { getDagreLayoutedElements, getForceLayoutedElements } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { useGraphStore, type GraphNode, type GraphEdge } from "@/stores/graph-store"
import { CustomNode } from "./custom/custom-node"
// import FloatingEdge from "./custom/floating-edge"
import FloatingConnectionLine from "./custom/connection-line"
import GraphLoader from "../graph-loader"
import { useGraphControls } from "@/stores/graph-controls-store"
import { useNodesDisplaySettings } from "@/stores/node-display-settings"
import ContextMenu from './custom/context-menu';
import { useLayoutStore } from "@/stores/layout-store"
import SimpleFloatingEdge from './custom/floating-edge';

const nodeTypes = {
    custom: CustomNode,
};

// const edgeTypes = {
//     custom: SimpleFloatingEdge,
// };

const Wall = memo(({ theme, edges }: { theme: ColorMode, edges: GraphEdge[] }) => {
    const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow()
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const colors = useNodesDisplaySettings(state => state.colors)
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
    const setActions = useGraphControls(state => state.setActions)
    // Memoize store selectors
    const nodes = useGraphStore(state => state.nodes)
    const toggleNodeSelection = useGraphStore(state => state.toggleNodeSelection)
    const currentNode = useGraphStore(state => state.currentNode)
    const setCurrentNode = useGraphStore(state => state.setCurrentNode)
    const clearSelectedNodes = useGraphStore(state => state.clearSelectedNodes)
    const setNodes = useGraphStore(state => state.setNodes)
    const setEdges = useGraphStore(state => state.setEdges)
    const addNode = useGraphStore(state => state.addNode)
    const onNodesChange = useGraphStore(state => state.onNodesChange)
    const onEdgesChange = useGraphStore(state => state.onEdgesChange)
    const onConnect = useGraphStore(state => state.onConnect)
    const setOpenNodeEditorModal = useGraphStore(state => state.setOpenNodeEditorModal)
    const setActiveTab = useLayoutStore((s) => s.setActiveTab)

    const [menu, setMenu] = useState<{
        node: GraphNode;
        top: number;
        left: number;
        right: number;
        bottom: number;
        wrapperWidth: number;
        wrapperHeight: number;
        setMenu: (menu: any | null) => void;
    } | null>(null);

    // Memoize filtered nodes and edges
    const visibleNodes = useMemo(() => nodes.filter(n => !n.hidden), [nodes])
    const visibleEdges = useMemo(() => edges.filter(e => !e.hidden), [edges])

    // Center view on selected node
    useEffect(() => {
        if (currentNode && reactFlowInstance) {
            const nodeWidth = currentNode.measured?.width ?? 0
            const nodeHeight = currentNode.measured?.height ?? 0
            setCenter(
                currentNode.position.x + nodeWidth / 2,
                currentNode.position.y + nodeHeight / 2 + 20,
                { duration: 500, zoom: 1.5 }
            )
        }
    }, [currentNode, reactFlowInstance, setCenter])

    useEffect(() => {
        if (reactFlowInstance) {
            const actions = {
                zoomIn: zoomIn,
                zoomToFit: fitView,
                zoomOut: zoomOut,
                onLayout: onLayout,
            }
            setActions(actions)
        }
    }, [reactFlowInstance, setActions])

    const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
    }, [])

    const onDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            if (!reactFlowWrapper.current || !reactFlowInstance) return
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
            const newNodeData = JSON.parse(event.dataTransfer.getData("application/json")) as any & {
                type: string
            }
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            })
            const id = `${newNodeData.type}-${Date.now()}`
            const newNode: GraphNode = {
                id: id,
                position,
                data: {
                    id: id,
                    type: newNodeData.type,
                    caption: newNodeData.caption,
                    label: newNodeData.label,
                    created_at: new Date().toISOString(),
                },
            }
            addNode(newNode)
            const nodeWidth = newNode.measured?.width ?? 0
            const nodeHeight = newNode.measured?.height ?? 0
            setCenter(newNode.position.x + nodeWidth / 2, newNode.position.y + nodeHeight / 2 + 20, {
                duration: 500,
                zoom: 1.5,
            })
        },
        [reactFlowInstance, addNode, setCenter],
    )

    const onNodeClick: NodeMouseHandler = useCallback(
        (e: React.MouseEvent, node: Node) => {
            if (e.shiftKey) {
                toggleNodeSelection(node as GraphNode, true)
                return
            }
            const typedNode = node as GraphNode
            setCurrentNode(typedNode)
            setActiveTab("entities")
            const nodeWidth = typedNode.measured?.width ?? 0
            const nodeHeight = typedNode.measured?.height ?? 0
            setCenter(typedNode.position.x + nodeWidth / 2, typedNode.position.y + nodeHeight / 2 + 20, {
                duration: 500,
                zoom: 1.5,
            })
        },
        [setCenter, setCurrentNode],
    )

    const onNodeDoubleClick: NodeMouseHandler = useCallback(
        (_: React.MouseEvent, node: Node) => {
            const typedNode = node as GraphNode
            setCurrentNode(typedNode)
            setOpenNodeEditorModal(true)
        },
        [setCurrentNode],
    )

    const onPaneClick = useCallback(() => {
        setCurrentNode(null)
        clearSelectedNodes()
        setMenu(null)
    }, [setCurrentNode, clearSelectedNodes, setMenu])

    const onLayout = useCallback((type: "dagre-tb" | "dagre-lr" | "force") => {
        // Wait for nodes to be measured before running layout
        setTimeout(() => {
            let layouted: any;
            if (type === "dagre-tb") {
                layouted = getDagreLayoutedElements(
                    nodes,
                    edges,
                    { direction: "TB" }
                );
            } else if (type === "dagre-lr") {
                layouted = getDagreLayoutedElements(
                    nodes,
                    edges,
                    { direction: "LR" }
                );
            } else {
                layouted = getForceLayoutedElements(
                    nodes,
                    edges,
                    {
                        direction: "TB",
                        strength: -300,
                        distance: 100,
                        iterations: 300
                    }
                );
            }
            setNodes(layouted.nodes as GraphNode[])
            setEdges(layouted.edges as GraphEdge[])
            window.requestAnimationFrame(() => {
                fitView()
            })
        }, 100)
    }, [nodes, edges, setNodes, setEdges, fitView])

    // Run dagre layout on first render
    useEffect(() => {
        if (reactFlowInstance && nodes.length) {
            onLayout("dagre-tb")
        }
    }, [reactFlowInstance, nodes.length])

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

            // Calculate available space in each direction
            const menuWidth = 320; // Default menu width
            const menuHeight = 250; // Use a more reasonable height for overflow calculation
            const padding = 20; // Minimum padding from edges

            // Determine if menu would overflow in each direction
            const wouldOverflowRight = relativeX + menuWidth + padding > pane.width;
            const wouldOverflowBottom = relativeY + menuHeight + padding > pane.height;

            // Calculate final position
            let finalTop = 0;
            let finalLeft = 0;
            let finalRight = 0;
            let finalBottom = 0;

            if (wouldOverflowRight) {
                finalRight = pane.width - relativeX;
            } else {
                finalLeft = relativeX;
            }

            if (wouldOverflowBottom) {
                finalBottom = pane.height - relativeY;
            } else {
                finalTop = relativeY;
            }

            setMenu({
                node: node as GraphNode,
                top: finalTop,
                left: finalLeft,
                right: finalRight,
                bottom: finalBottom,
                wrapperWidth: pane.width,
                wrapperHeight: pane.height,
                setMenu: setMenu,
            });
        },
        [setMenu],
    );

    // Memoize ReactFlow props
    const reactFlowProps = useMemo(() => ({
        nodes: visibleNodes,
        edges: visibleEdges,
        nodeTypes,
        // edgeTypes: edgeTypes as EdgeTypes,
        onInit: setReactFlowInstance,
        onNodeContextMenu,
        onDrop,
        onDragOver,
        onNodeClick,
        onNodeDoubleClick,
        onPaneClick,
        onNodesChange,
        onEdgesChange,
        onConnect,
        connectionLineComponent: FloatingConnectionLine,
        fitView: true,
        proOptions: { hideAttribution: true },
        colorMode: theme,
        minZoom: 0.1,
        maxZoom: 2.5,
        onlyRenderVisibleElements: nodes.length > 500,
        connectionMode: ConnectionMode.Loose
    }), [
        visibleNodes,
        visibleEdges,
        onDrop,
        onNodeContextMenu,
        onDragOver,
        onNodeClick,
        onNodeDoubleClick,
        onPaneClick,
        onNodesChange,
        onEdgesChange,
        onConnect,
        theme,
        nodes.length
    ])

    return (
        <>
            <div ref={reactFlowWrapper} className="w-full h-full bg-background">
                <ReactFlow {...reactFlowProps}>
                    <Background variant={"dots" as BackgroundVariant} bgColor="var(--background)" />
                    {menu && <ContextMenu
                        onClick={onPaneClick}
                        {...menu}
                    />}
                    <MiniMap nodeBorderRadius={80} nodeClassName={"h-16 w-16 text-center"} nodeColor={(node) => colors[node.data.type as keyof typeof colors]} className="bg-background" position="bottom-right" pannable zoomable />
                </ReactFlow>
            </div>
        </>
    )
})

Wall.displayName = "Wall"

const WallEditor = memo(({ isLoading, isRefetching }: { isLoading: boolean, isRefetching: boolean }) => {
    const { theme } = useTheme()
    const edges = useGraphStore(state => state.edges)

    const edgesWithMarkers = useMemo(() => edges.map(edge => ({
        ...edge,
        markerEnd: {
            type: MarkerType.ArrowClosed,
        },
        // markerStart: {
        //     type: MarkerType.ArrowClosed,
        //     orient: 'auto-start-reverse',
        // },
    })), [edges])

    if (isLoading || isRefetching) {
        return <GraphLoader />
    }

    return (
        <ReactFlowProvider>
            <Wall edges={edgesWithMarkers} theme={theme as ColorMode} />
        </ReactFlowProvider>
    )
})

WallEditor.displayName = "WallEditor"

export default WallEditor
