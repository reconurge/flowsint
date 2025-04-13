"use client"
import { useCallback, useEffect, useState, useMemo } from "react"
import type React from "react"
import {
    ReactFlow,
    ReactFlowProvider,
    Panel,
    useReactFlow,
    // @ts-ignore
    Background,
    // @ts-ignore
    MiniMap,
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
import NewActions from "../sketches/new-actions"
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
import PanelContextMenu from "../sketches/panel-context-menu"
import { memo } from "react"
import { shallow } from "zustand/shallow"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import FullscreenButton from "@/components/full-screen-button"
import ProfilePanel from "../sketches/sketch/profile-panel"
import NodesPanel from "../sketches/sketch/nodes-panel"
import OrganigramNode from "./organigram-node"
import OrganigramEdge from './organigram-edge'
const nodeTypes = {
    custom: OrganigramNode,
}

const edgeTypes = {
    custom: OrganigramEdge,
}
// Better selectors with more specific equality comparisons
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
const FlowControls = memo(({
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
                        <Button size="icon" variant="outline" onClick={() => setView("large-graph")}>
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
    const { fitView, zoomIn, zoomOut, addNodes, getNode, setCenter, getNodes } = useReactFlow();
    const { sketch_id } = useParams();
    const showMiniMap = useSketchStore(state => state.settings.showMiniMap);
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
        updateNode,
        highlightPath
    } = useFlowStore(stateSelector, shallow);

    // Initialize layout once
    useEffect(() => {
        const timer = setTimeout(() => {
            onLayout("dagre", fitView);
            fitView();
        }, 500);
        return () => clearTimeout(timer);
    }, []); // Empty dependency array - run once only

    const handleRefetch = useCallback(() => {
        refetch();
        onLayout("dagre", fitView);
        fitView();
    }, [refetch, onLayout, fitView]);

    // Handle current node changes
    useEffect(() => {
        if (!currentNode) return;
        const internalNode = getNode(currentNode.id);
        if (!internalNode) return;
        updateNode(internalNode.id, {
            ...internalNode,
            zIndex: 5000,
            data: { ...internalNode.data, forceToolbarVisible: true },
            style: { ...internalNode.style, opacity: 1 },
        });
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
    }, [currentNode?.id]); // Only depend on currentNode.id, not the whole object

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
        nodeTypes,
        edgeTypes,
        proOptions: { hideAttribution: true },
        className: "!bg-background dark:!bg-background"
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
        <ResizablePanelGroup autoSaveId="persistence" direction="horizontal" className="w-screen grow relative overflow-hidden">
            <ResizablePanel defaultSize={80}>
                <TooltipProvider>
                    <Dialog>
                        <ContextMenu>
                            <ContextMenuTrigger className="h-full w-full">
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
                                    <Background className="dark:bg-background bg-background" />
                                    {showMiniMap && <MiniMap className="!z-40" pannable />}
                                </ReactFlow>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-32">
                                <DialogTrigger asChild>
                                    <ContextMenuItem>
                                        <PlusIcon className="h-4 w-4 opacity-60" />
                                        <span>New node</span>
                                    </ContextMenuItem>
                                </DialogTrigger>
                                <ContextMenuItem disabled>
                                    <GroupIcon className="h-4 w-4 opacity-60" />
                                    <span>New group</span>
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                        <PanelContextMenu addNodes={addNodes} />
                    </Dialog>
                </TooltipProvider>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={20} minSize={15} maxSize={40} className="h-full bg-background">
                <ResizablePanelGroup autoSaveId="conditional" direction="vertical">
                    {currentNode && (
                        <>
                            <ResizablePanel order={1} id="top" defaultSize={40}>
                                <ProfilePanel data={currentNode.data} type={currentNode.type} />
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                        </>
                    )}
                    <ResizablePanel order={2} id="bottom" defaultSize={60}>
                        <NodesPanel nodes={processedNodes} />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </ResizablePanel>
        </ResizablePanelGroup>
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
            <div className="grow w-full flex items-center justify-center">
                <Loader /> Loading...
            </div>
        );
    }

    return (
        <ReactFlowProvider>
            <LayoutFlow refetch={refetch} theme={resolvedTheme || "light"} />
        </ReactFlowProvider>
    );
}

export default memo(Graph);