import { useLoaderData } from '@tanstack/react-router'
import { useEffect, useRef, memo, useState, lazy, Suspense } from 'react'
import { useGraphStore, type GraphNode, type GraphEdge } from '@/stores/graph-store'
import { Toolbar } from './toolbar'
import { cn } from '@/lib/utils'
import { ArrowDownToLineIcon } from 'lucide-react'
import { CreateRelationDialog } from './create-relation'
import GraphLoader from './graph-loader'
import Loader from '../loader'
// import WallEditor from './wall/wall'
import { useGraphControls } from '@/stores/graph-controls-store'
import { NodeEditorModal } from './node-editor-modal'
import NodesTable from '../table'
import { findActionItemByKey } from '@/lib/action-items'
import { useActionItems } from '@/hooks/use-action-items'
import { toast } from 'sonner'
import MapPanel from '../map/map-panel'
import NewActions from './new-actions'
const GraphReactForce = lazy(() => import('./graph-react-force'))
const RelationshipsTable = lazy(() => import('@/components/table/relationships-view'))
// const GraphReactSigma = lazy(() => import('./graph-react-sigma'))

// const Graph = lazy(() => import('./graph'))

const NODE_COUNT_THRESHOLD = 1000;

// Separate component for the drag overlay
const DragOverlay = memo(({ isDragging }: { isDragging: boolean }) => (
    <div
        className={cn(
            'absolute flex items-center justify-center inset-0 bg-background/80 backdrop-blur-sm gap-1',
            'opacity-0 pointer-events-none transition-opacity duration-200',
            isDragging && 'opacity-100 pointer-events-auto'
        )}
    >
        <p className="font-medium">Drop here to add node</p>
        <ArrowDownToLineIcon className="opacity-60" />
    </div>
))
DragOverlay.displayName = 'DragOverlay'

interface GraphPanelProps {
    graphData: { nds: GraphNode[]; rls: GraphEdge[] } | null;
    isLoading: boolean;
    isRefetching: boolean;
}

const GraphPanel = ({ graphData, isLoading, isRefetching }: GraphPanelProps) => {
    const graphPanelRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(isLoading)
    const handleOpenFormModal = useGraphStore(s => s.handleOpenFormModal)
    const nodes = useGraphStore(s => s.nodes)
    const view = useGraphControls((s) => s.view)
    const updateGraphData = useGraphStore(s => s.updateGraphData)
    const { actionItems, isLoading: isLoadingActionItems } = useActionItems()
    const { sketch } = useLoaderData({
        from: '/_auth/dashboard/investigations/$investigationId/$type/$id',
    })
    const [isDraggingOver, setIsDraggingOver] = useState(false)

    useEffect(() => {
        updateGraphData([], [])
        if (graphData?.nds && graphData?.rls) {
            updateGraphData(graphData.nds, graphData.rls)
            setLoading(false)
        }
    }, [graphData?.nds, graphData?.rls, setLoading])

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDraggingOver(true)
    }

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDraggingOver(true)
    }

    const handleDragLeave = () => {
        setIsDraggingOver(false)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDraggingOver(false)
        if (isLoadingActionItems || !actionItems) {
            toast.error("Sorry, an error occured. Please try again.")
            return
        }
        const data = e.dataTransfer.getData("text/plain")
        if (data) {
            try {
                const parsedData = JSON.parse(data)
                handleOpenFormModal(findActionItemByKey(parsedData.itemKey, actionItems))
            } catch (error) {
                return
            }
        }
    }
    if (isLoading) {
        return <GraphLoader />
    }

    if (!sketch || !graphData) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-destructive mb-2">
                        Error loading graph
                    </h2>
                    <p className="text-muted-foreground">
                        Could not load graph data. Please try again.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={graphPanelRef}
            className="h-full w-full flex relative outline-2 outline-transparent bg-background"
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <Suspense fallback={
                <div className="h-full w-full flex items-center justify-center">
                    <div className="text-center flex items-center gap-2">
                        <Loader />
                    </div>
                </div>
            }>
                {nodes?.length > NODE_COUNT_THRESHOLD ? (
                    <>{view === "table" && <NodesTable />}
                        {["force", "hierarchy"].includes(view) && <GraphReactForce />}
                        {view === "map" && <MapPanel />}
                        {view === "relationships" && <RelationshipsTable />}
                    </>
                ) : (<>
                    {view === "force" && <GraphReactForce />}
                    {/* {view === "hierarchy" && <WallEditor isRefetching={isRefetching} isLoading={loading} />} */}
                    {view === "table" && <NodesTable />}
                    {view === "map" && <MapPanel />}
                    {view === "relationships" && <RelationshipsTable />}
                </>)}
            </Suspense>
            {/* <Graph /> */}
            {/* <GraphSigma /> */}
            <DragOverlay isDragging={isDraggingOver} />
            <div className='absolute z-21 left-3 top-3'>
                <Toolbar isLoading={isLoading} />
            </div>
            <NewActions />
            <CreateRelationDialog />
            <NodeEditorModal />
        </div>
    )
}

export default memo(GraphPanel)