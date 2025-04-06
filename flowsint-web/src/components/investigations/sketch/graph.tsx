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
    type ColorMode,
    // @ts-ignore
    MiniMap,
    type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import IndividualNode from "./nodes/person"
import PhoneNode from "./nodes/phone"
import IpNode from "./nodes/ip_address"
import EmailNode from "./nodes/email"
import SocialNode from "./nodes/social"
import AddressNode from "./nodes/physical_address"
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
import { useInvestigationStore } from "@/store/investigation-store"
import { useFlowStore } from "@/store/flow-store"
import Loader from "@/components/loader"
import { useQueryState } from "nuqs"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import AddNodeModal from "../add-node-modal"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { memo } from "react"
import { shallow } from "zustand/shallow"
import { TooltipProvider } from "@/components/ui/tooltip"
import NodeContextMenu from "./nodes/node-context-menu"
import GroupNode from "./nodes/group"
import CustomEdge from "./nodes/custom-edge"
import { BaseNode } from "@/components/ui/base-node"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import NodesPanel from "./nodes-panel"
import ProfilePanel from "./profile-panel"
import Vehicle from "./nodes/vehicle"

const edgeTypes = {
    custom: CustomEdge,
}
const nodeTypes = {
    individual: IndividualNode,
    phone: PhoneNode,
    ip: IpNode,
    email: EmailNode,
    social: SocialNode,
    address: AddressNode,
    group: GroupNode,
    default: BaseNode,
    vehicle: Vehicle
}
const nodeEdgeSelector = (store: { nodes: any; edges: any }) => ({
    nodes: store.nodes,
    edges: store.edges,
})
const actionsSelector = (store: {
    onNodesChange: any
    onEdgesChange: any
    onConnect: any
    onNodeClick: any
    onPaneClick: any
    onLayout: any
}) => ({
    onNodesChange: store.onNodesChange,
    onEdgesChange: store.onEdgesChange,
    onConnect: store.onConnect,
    onNodeClick: store.onNodeClick,
    onPaneClick: store.onPaneClick,
    onLayout: store.onLayout,
})
const stateSelector = (store: {
    currentNode: any;
    setCurrentNode: any,
    resetNodeStyles: any;
    reloading: any;
    updateNode: any;
    highlightPath: any;
}) => ({
    currentNode: store.currentNode,
    resetNodeStyles: store.resetNodeStyles,
    reloading: store.reloading,
    setCurrentNode: store.setCurrentNode,
    updateNode: store.updateNode,
    highlightPath: store.highlightPath
})
interface FlowControlsProps {
    onLayout: (direction: string, fitView: () => void) => void
    fitView: () => void
    handleRefetch: () => void
    reloading: boolean
    setView: (view: string) => void
    zoomIn: () => void
    zoomOut: () => void
    addNodes: (payload: any) => void
    currentNode: any | null | undefined
}
const FlowControls = memo(
    ({ onLayout, fitView, handleRefetch, reloading, setView, zoomIn, zoomOut, addNodes, currentNode }: FlowControlsProps) => {
        return (
            <>
                <Panel position="top-left" className="flex flex-col items-center gap-1">
                    <NewActions addNodes={addNodes} />
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
                                onClick={() => {
                                    onLayout("dagre", fitView)
                                }}
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
                                onClick={() => {
                                    onLayout("force", fitView)
                                }}
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
    },
    // Comparateur personnalisé pour le composant mémorisé
    (prevProps, nextProps) => {
        return (
            prevProps.reloading === nextProps.reloading &&
            prevProps.currentNode?.id === nextProps.currentNode?.id
        )
    }
)
interface LayoutFlowProps {
    refetch: () => void
    theme: string
}
const LayoutFlow = ({ refetch, theme }: LayoutFlowProps) => {
    const { fitView, zoomIn, zoomOut, addNodes, getNode, setCenter, getNodes } = useReactFlow()
    const { investigation_id } = useParams()
    const { settings } = useInvestigationStore()
    const [_, setView] = useQueryState("view", { defaultValue: "flow-graph" })
    const [nodeContextMenu, setNodeContextMenu] = useState<{
        x: number
        y: number
        nodeId: string | null
        nodeType: string | null
        data: any
    } | null>(null)
    const { nodes, edges } = useFlowStore(nodeEdgeSelector, shallow)
    const { onNodesChange, onEdgesChange, onConnect, onNodeClick, onPaneClick, onLayout } = useFlowStore(
        actionsSelector,
        shallow,
    )
    const {
        currentNode,
        setCurrentNode,
        reloading,
        updateNode,
        highlightPath
    } = useFlowStore(stateSelector, shallow)
    const initialLayout = useCallback(() => {
        const timer = setTimeout(() => {
            onLayout("force", fitView)
            fitView()
        }, 500)
        return () => clearTimeout(timer)
    }, [onLayout, fitView])
    useEffect(() => {
        return initialLayout()
    }, [initialLayout])
    const handleRefetch = useCallback(() => {
        refetch()
        onLayout("force", fitView)
        fitView()
    }, [refetch, onLayout, fitView])
    useEffect(() => {
        if (!currentNode) return
        const internalNode = getNode(currentNode.id)
        if (!internalNode) return
        updateNode(internalNode.id, {
            ...internalNode,
            zIndex: 5000,
            data: { ...internalNode.data, forceToolbarVisible: true },
            style: { ...internalNode.style, opacity: 1 },
        })
        const nodeWidth = internalNode.measured?.width ?? 0
        const nodeHeight = internalNode.measured?.height ?? 0
        setCenter(internalNode.position.x + nodeWidth / 2, internalNode.position.y + nodeHeight / 2 + 20, {
            duration: 1000,
            zoom: 1.5,
        })
    }, [currentNode, getNode, setCenter, updateNode, highlightPath])
    const handleConnect = useCallback(
        (params: any) => onConnect(params, investigation_id),
        [onConnect, investigation_id]
    )
    const handleNodeContextMenu = useCallback<NodeMouseHandler>(
        (event, node) => {
            event.preventDefault()
            event.stopPropagation()
            setCurrentNode(node)
            setNodeContextMenu({
                x: event.screenX - 200,
                y: event.screenY - 150,
                nodeId: node.id,
                data: node.data,
                nodeType: node.type || "default",
            })
        },
        [setCurrentNode]
    )
    const closeNodeContextMenu = useCallback(() => {
        setNodeContextMenu(null)
    }, [])
    const handlePaneClick = useCallback(
        (event: React.MouseEvent) => {
            closeNodeContextMenu()
            onPaneClick(event)
        },
        [onPaneClick, closeNodeContextMenu]
    )
    const reactFlowProps = useMemo(() => ({
        colorMode: theme as ColorMode,
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect: handleConnect,
        onNodeClick,
        onPaneClick: handlePaneClick,
        onNodeContextMenu: handleNodeContextMenu,
        minZoom: 0.7,
        fitView: true,
        proOptions: { hideAttribution: true },
        edgeTypes,
        nodeTypes,
        className: "!bg-background"
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
    ])
    const processedNodes = useMemo(() => nodes.map(({ id, data, type }: any) => ({ id, data, type })).sort((a: { type: string }, b: { type: any }) => b.type.localeCompare(a.type))
        , [nodes.length]);
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
                                        currentNode={currentNode}
                                    />
                                    <Background />
                                    {settings.showMiniMap && <MiniMap className="!z-40" pannable />}
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
                        <AddNodeModal addNodes={addNodes} />
                    </Dialog>
                    <NodeContextMenu
                        x={nodeContextMenu?.x}
                        y={nodeContextMenu?.y}
                        onClose={closeNodeContextMenu}
                    />
                </TooltipProvider>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={20} className="h-full">
                <ResizablePanelGroup autoSaveId="conditional" direction="vertical">
                    {currentNode && <>
                        <ResizablePanel order={1} id="top" defaultSize={50}>
                            <ProfilePanel data={currentNode.data} />
                        </ResizablePanel>
                        <ResizableHandle />
                    </>}
                    <ResizablePanel order={2} id="bottom" defaultSize={50}>
                        <NodesPanel nodes={processedNodes} />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </ResizablePanel>
        </ResizablePanelGroup>
    )
}
const MemoizedLayoutFlow = memo(LayoutFlow, (prevProps, nextProps) => {
    return prevProps.theme === nextProps.theme && prevProps.refetch === nextProps.refetch
})
function Graph({ graphQuery }: { graphQuery: any }) {
    const [mounted, setMounted] = useState(false)
    const { refetch, isLoading, data } = graphQuery
    const { resolvedTheme } = useTheme()
    useEffect(() => {
        setMounted(true)
    }, [])
    useEffect(() => {
        if (data) {
            useFlowStore.setState({ nodes: data?.nodes, edges: data?.edges })
            setMounted(true)
        }
    }, [data])
    if (!mounted || isLoading) {
        return (
            <div className="grow w-full flex items-center justify-center">
                <Loader /> Loading...
            </div>
        )
    }
    return (
        <ReactFlowProvider>
            <MemoizedLayoutFlow refetch={refetch} theme={resolvedTheme || "light"} />
        </ReactFlowProvider>
    )
}
export default memo(Graph)