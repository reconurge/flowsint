"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
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
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import IndividualNode from "./nodes/individual"
import PhoneNode from "./nodes/phone"
import IpNode from "./nodes/ip_address"
import EmailNode from "./nodes/email"
import SocialNode from "./nodes/social"
import AddressNode from "./nodes/physical_address"
import {
    AlignCenterVertical,
    MaximizeIcon,
    ZoomInIcon,
    ZoomOutIcon,
    RotateCwIcon,
    PlusIcon,
    GroupIcon,
    WorkflowIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import NewActions from "./new-actions"
import FloatingEdge from "./floating-edge"
import FloatingConnectionLine from "./floating-connection"
import { useParams } from "next/navigation"
import { Tooltip, TooltipContent } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { TooltipTrigger } from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"
import { useInvestigationStore } from "@/store/investigation-store"
import { useFlowStore } from "../../store/flow-store"
import Loader from "../loader"
import { useQueryState } from "nuqs"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../ui/context-menu"
import AddNodeModal from "./add-node-modal"
import { Dialog, DialogTrigger } from "../ui/dialog"
import { memo } from "react"
import { shallow } from "zustand/shallow"
import CustomEdge from "./custom-edge"
import floatingEdge from "./floating-edge"

// Define constants outside component to prevent recreation
const edgeTypes = {
    custom: floatingEdge
}

const nodeTypes = {
    individual: IndividualNode,
    phone: PhoneNode,
    ip: IpNode,
    email: EmailNode,
    social: SocialNode,
    address: AddressNode,
}

// Split selectors to minimize re-renders
const nodeEdgeSelector = (store: { nodes: any; edges: any }) => ({
    nodes: store.nodes,
    edges: store.edges,
})

const actionsSelector = (store: { onNodesChange: any; onEdgesChange: any; onConnect: any; onNodeClick: any; onPaneClick: any; onLayout: any }) => ({
    onNodesChange: store.onNodesChange,
    onEdgesChange: store.onEdgesChange,
    onConnect: store.onConnect,
    onNodeClick: store.onNodeClick,
    onPaneClick: store.onPaneClick,
    onLayout: store.onLayout,
})

const stateSelector = (store: { currentNode: any; resetNodeStyles: any; reloading: any }) => ({
    currentNode: store.currentNode,
    resetNodeStyles: store.resetNodeStyles,
    reloading: store.reloading,
})

// FlowControls component to reduce LayoutFlow complexity
interface FlowControlsProps {
    onLayout: (direction: string, fitView: () => void) => void;
    fitView: () => void;
    handleRefetch: () => void;
    reloading: boolean;
    setView: (view: string) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    addNodes: (payload: Node | Node[]) => void;
}

const FlowControls = memo(({ onLayout, fitView, handleRefetch, reloading, setView, zoomIn, zoomOut, addNodes }: FlowControlsProps) => {
    return (
        <>
            <Panel position="top-left" className="flex items-center gap-1 w-53">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                                onLayout("TB", fitView)
                                setTimeout(() => {
                                    fitView()
                                }, 100)
                            }}
                        >
                            <AlignCenterVertical className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Auto layout</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" onClick={() => setView("large-graph")}>
                            <WorkflowIcon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>View 2D Graph</TooltipContent>
                </Tooltip>
            </Panel>
            <Panel position="top-right" className="flex items-center gap-1">
                <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-1 items-center">
                        <Button size="icon" disabled={reloading} variant="outline" onClick={handleRefetch}>
                            <RotateCwIcon className={cn("h-4 w-4", reloading && "animate-spin")} />
                        </Button>
                        <NewActions addNodes={addNodes} />
                    </div>
                </div>
            </Panel>
            <Panel position="bottom-left" className="flex flex-col items-center gap-1">
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

interface LayoutFlowProps {
    refetch: () => void;
    theme: string;
}

const LayoutFlow = ({ refetch, theme }: LayoutFlowProps) => {
    const { fitView, zoomIn, zoomOut, addNodes, getNode, setCenter } = useReactFlow()
    const { investigation_id } = useParams()
    const { settings } = useInvestigationStore()
    const [_, setView] = useQueryState("view", { defaultValue: "flow-graph" })

    // Split store access to minimize re-renders
    const { nodes, edges } = useFlowStore(nodeEdgeSelector, shallow)
    const { onNodesChange, onEdgesChange, onConnect, onNodeClick, onPaneClick, onLayout } =
        useFlowStore(actionsSelector, shallow)
    const { currentNode, resetNodeStyles, reloading } = useFlowStore(stateSelector, shallow)

    // Initial layout
    useEffect(() => {
        const timer = setTimeout(() => {
            onLayout("TB", fitView)
            fitView()
        }, 500)
        return () => clearTimeout(timer)
    }, [onLayout, fitView])

    const handleRefetch = useCallback(() => {
        refetch()
        onLayout("TB", fitView)
        const timer = setTimeout(() => {
            fitView()
        }, 100)
        return () => clearTimeout(timer)
    }, [refetch, onLayout, fitView])

    // Node highlighting effect
    useEffect(() => {
        resetNodeStyles()
        if (!currentNode) return;

        const internalNode = getNode(currentNode)
        if (!internalNode) return

        useFlowStore.getState().updateNode(internalNode.id, {
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

        useFlowStore.getState().highlightPath(internalNode)
    }, [currentNode, getNode, setCenter, resetNodeStyles])

    // Memoize connection handler to prevent recreation
    const handleConnect = useCallback(
        (params: any) => onConnect(params, investigation_id),
        [onConnect, investigation_id]
    )

    return (
        <div className="h-[calc(100vh_-_48px)] relative">
            <Dialog>
                <ContextMenu>
                    <ContextMenuTrigger className="h-full w-full">
                        <ReactFlow
                            colorMode={theme as ColorMode}
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={handleConnect}
                            onNodeClick={onNodeClick}
                            onPaneClick={onPaneClick}
                            minZoom={0.1}
                            // @ts-ignore
                            connectionLineComponent={FloatingConnectionLine}
                            fitView
                            proOptions={{ hideAttribution: true }}
                            nodeTypes={nodeTypes}
                            // @ts-ignore
                            // edgeTypes={edgeTypes}
                            className="!bg-background"
                        >
                            <FlowControls
                                onLayout={onLayout}
                                fitView={fitView}
                                handleRefetch={handleRefetch}
                                reloading={reloading}
                                setView={setView}
                                zoomIn={zoomIn}
                                zoomOut={zoomOut}
                                // @ts-ignore
                                addNodes={addNodes}
                            />
                            <Background />
                            {settings.showMiniMap && <MiniMap pannable />}
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
        </div>
    )
};

// Memoize LayoutFlow to prevent unnecessary re-renders
const MemoizedLayoutFlow = memo(LayoutFlow);

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
            <div className="h-[calc(100vh_-_48px)] w-full flex items-center justify-center">
                <Loader /> Loading...
            </div>
        )
    }

    return (
        <ReactFlowProvider>
            {/* @ts-ignore */}
            <MemoizedLayoutFlow refetch={refetch} isLoading={isLoading as boolean} theme={resolvedTheme as string} />
        </ReactFlowProvider>
    )
}

// Export the memoized Graph component
export default memo(Graph)