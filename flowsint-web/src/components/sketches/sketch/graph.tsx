"use client"
import { useCallback, useEffect, useState, useMemo } from "react"
import type React from "react"
import {
    ReactFlow,
    Panel,
    useReactFlow,
    // @ts-ignore
    Background,
    // @ts-ignore
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
    MaximizeIcon,
    ZoomInIcon,
    ZoomOutIcon,
    RotateCwIcon,
    PlusIcon,
    GroupIcon,
    WorkflowIcon,
    NetworkIcon,
    WaypointsIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import NewActions from "../new-actions"
import { useParams } from "next/navigation"
import { Tooltip, TooltipContent } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { TooltipTrigger } from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"
import { useSketchStore } from "@/store/sketch-store"
import { useFlowStore } from "@/store/flow-store"
import Loader from "@/components/loader"
import { useQueryState } from "nuqs"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { memo } from "react"
import { shallow } from "zustand/shallow"
import { TooltipProvider } from "@/components/ui/tooltip"
import NodeContextMenu from "./nodes/node-context-menu"
import CustomNode from "./nodes/custom-node"
import FullscreenButton from "@/components/full-screen-button"
import FloatingEdge from "./simple-floating-edge"

const edgeTypes = {
    custom: FloatingEdge,
}
const nodeTypes = {
    custom: CustomNode,
}

const nodeEdgeSelector = (state: { nodes: any; edges: any }) => ({
    nodes: state.nodes,
    edges: state.edges,
})

const actionsSelector = (state: { onNodesChange: any; onEdgesChange: any; onConnect: any; onNodeClick: any; onPaneClick: any; onLayout: any }) => ({
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    onNodeClick: state.onNodeClick,
    onPaneClick: state.onPaneClick,
    onLayout: state.onLayout,
})

const stateSelector = (state: { currentNode: any; setCurrentNode: any; resetNodeStyles: any; reloading: any; updateNode: any; highlightPath: any }) => ({
    currentNode: state.currentNode,
    setCurrentNode: state.setCurrentNode,
    resetNodeStyles: state.resetNodeStyles,
    reloading: state.reloading,
    updateNode: state.updateNode,
    highlightPath: state.highlightPath
})

// Properly memoized FlowControls component
export const FlowControls = memo(({
    onLayout,
    fitView,
    handleRefetch,
    reloading,
    setView,
    zoomIn,
    zoomOut,
    addNodes
}: any) => {
    return (
        <>
            <Panel position="top-right" className="flex flex-col items-center gap-1">
                <FullscreenButton />
            </Panel>
            <Panel position="top-left" className="flex flex-col items-center gap-1">
                <NewActions addNodes={addNodes}>
                    <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 px-6 py-2 text-white border-none" size="icon">
                        <PlusIcon />
                    </Button>
                </NewActions>
                <Button size="icon" disabled={reloading} variant="outline" onClick={handleRefetch}>
                    <RotateCwIcon className={cn("h-4 w-4", reloading && "animate-spin")} />
                </Button>
            </Panel>
            <Panel position="bottom-left" className="flex flex-col items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => onLayout("dagre", fitView)}
                        >
                            <NetworkIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Dagre layout</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => onLayout("force", fitView)}
                        >
                            <WaypointsIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Force layout</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button disabled size="icon" variant="outline" onClick={() => setView("large-graph")}>
                            <WorkflowIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>View 2D Graph</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" onClick={() => fitView()}>
                            <MaximizeIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Center view</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" onClick={() => zoomIn()}>
                            <ZoomInIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom in</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" onClick={() => zoomOut()}>
                            <ZoomOutIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom out</TooltipContent>
                </Tooltip>
            </Panel>
        </>
    )
});

const LayoutFlow = memo(({ refetch, theme }: any) => {
    const { fitView, zoomIn, zoomOut, addNodes, getNode, setCenter } = useReactFlow();
    const { sketch_id } = useParams();
    const [_, setView] = useQueryState("view", { defaultValue: "flow-graph" });

    // Use a ref for context menu state to avoid re-renders on position changes
    const [nodeContextMenu, setNodeContextMenu] = useState<{
        x: number;
        y: number;
        nodeId: string;
        data: any;
        nodeType: string;
    } | null>(null);

    // Use shallow comparison for complex objects from the store
    const { nodes, edges } = useFlowStore(nodeEdgeSelector, shallow);
    const {
        onNodesChange,
        onEdgesChange,
        onConnect,
        onNodeClick,
        onPaneClick,
        onLayout
    } = useFlowStore(actionsSelector, shallow);

    const {
        currentNode,
        setCurrentNode,
        reloading,
    } = useFlowStore(stateSelector, shallow);

    // Initialize layout once
    useEffect(() => {
        const timer = setTimeout(() => {
            onLayout("force", fitView);
            fitView();
        }, 500);
        return () => clearTimeout(timer);
    }, []); // Empty dependency array - run once only

    const handleRefetch = useCallback(() => {
        refetch();
        onLayout("force", fitView);
        fitView();
    }, [refetch, onLayout, fitView]);

    useEffect(() => {
        if (!currentNode) return;
        const internalNode = getNode(currentNode.id);
        if (!internalNode) return;
        const nodeWidth = internalNode.measured?.width ?? 0;
        const nodeHeight = internalNode.measured?.height ?? 0;
        setCenter(
            internalNode.position.x + nodeWidth / 2,
            internalNode.position.y + nodeHeight / 2 + 20,
            {
                duration: 500,
                zoom: 1.5,
            }
        );
    }, [currentNode?.id]);

    const handleConnect = useCallback(
        (params: any) => onConnect(params, sketch_id),
        [onConnect, sketch_id]
    );

    const handleNodeContextMenu = useCallback(
        (event: { preventDefault: () => void; stopPropagation: () => void; screenX: number; screenY: number }, node: { id: any; data: any; type?: any }) => {
            event.preventDefault();
            event.stopPropagation();
            setCurrentNode(node);
            setNodeContextMenu({
                x: event.screenX - 200,
                y: event.screenY - 150,
                nodeId: node.id,
                data: node.data,
                nodeType: node.type || "default",
            });
        },
        [setCurrentNode]
    );

    const closeNodeContextMenu = useCallback(() => {
        setNodeContextMenu(null);
    }, []);

    const handlePaneClick = useCallback(
        (event: any) => {
            closeNodeContextMenu();
            onPaneClick(event);
        },
        [onPaneClick, closeNodeContextMenu]
    );

    // Memoize ReactFlow props to prevent unnecessary re-renders
    const reactFlowProps = useMemo(() => ({
        colorMode: theme,
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect: handleConnect,
        onNodeClick,
        onPaneClick: handlePaneClick,
        onNodeContextMenu: handleNodeContextMenu,
        minZoom: 0.5,
        fitView: true,
        proOptions: { hideAttribution: true },
        // edgeTypes,
        nodeTypes,
    }), [
        theme,
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        handleConnect,
        onNodeClick,
        handlePaneClick,
        handleNodeContextMenu
    ]);

    // Process nodes only when nodes array length changes
    const processedNodes = useMemo(() =>
        nodes.map(({ id, data, type }: { id: string; data: any; type: string }) => ({ id, data, type }))
            .sort((a: { type: any }, b: { type: string }) => b.type?.localeCompare(a.type || "")),
        [nodes.length]
    );

    return (
        <TooltipProvider>
            <ReactFlow {...reactFlowProps}>
                <FlowControls
                    onLayout={onLayout}
                    fitView={fitView}
                    handleRefetch={handleRefetch}
                    reloading={reloading}
                    setView={setView}
                    zoomIn={zoomIn}
                    zoomOut={zoomOut}
                    addNodes={addNodes}
                />
                <Background bgColor="var(--background)" />
            </ReactFlow>
            <NodeContextMenu
                x={nodeContextMenu?.x}
                y={nodeContextMenu?.y}
                onClose={closeNodeContextMenu}
            />
        </TooltipProvider>
    );
});

function Graph({ graphQuery }: any) {
    const [mounted, setMounted] = useState(false);
    const { refetch, isLoading, data } = graphQuery;
    const { resolvedTheme } = useTheme();

    // Only run mounting effect once
    useEffect(() => {
        setMounted(true);
    }, []);

    // Update flow store when data changes
    useEffect(() => {
        if (data) {
            useFlowStore.setState({
                nodes: data?.nodes || [],
                edges: data?.edges || []
            });
            setMounted(true);
        }
    }, [data]);

    if (!mounted || isLoading) {
        return (
            <div className="grow w-full h-full flex items-center justify-center">
                <Loader /> Loading...
            </div>
        );
    }

    return (
        <LayoutFlow refetch={refetch} theme={resolvedTheme || "light"} />
    );
}

export default memo(Graph);