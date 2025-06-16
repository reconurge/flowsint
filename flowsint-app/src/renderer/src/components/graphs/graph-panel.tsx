import { useLoaderData } from '@tanstack/react-router'
import { useEffect, useRef, memo, useState, lazy, Suspense } from 'react'
// import Graph from '../sketches/graph'
import { useSketchStore } from '@/stores/sketch-store'
import { Toolbar } from '../sketches/toolbar'
import { cn } from '@/lib/utils'
import { ArrowDownToLineIcon } from 'lucide-react'
import { CreateRelationDialog } from './create-relation'
// import GraphSigma from '../sketches/graph-sigma'
import type { NodeData, EdgeData } from '@/types'
import GraphLoader from './graph-loader'
import Loader from '../loader'

const GraphReactForce = lazy(() => import('../sketches/graph-react-force'))
const Graph = lazy(() => import('../sketches/graph'))
// const GraphSigma = lazy(() => import('../sketches/graph-sigma'))


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
    graphData: { nds: NodeData[]; rls: EdgeData[] } | null;
    isLoading: boolean;
}

const GraphPanel = ({ graphData, isLoading }: GraphPanelProps) => {
    const graphPanelRef = useRef<HTMLDivElement>(null)
    const handleOpenFormModal = useSketchStore(s => s.handleOpenFormModal)
    const nodes = useSketchStore(s => s.nodes)
    const updateGraphData = useSketchStore(s => s.updateGraphData)
    const { sketch } = useLoaderData({
        from: '/_auth/dashboard/investigations/$investigationId/$type/$id',
    })
    const [isDraggingOver, setIsDraggingOver] = useState(false)

    useEffect(() => {
        if (graphData?.nds && graphData?.rls) {
            updateGraphData(graphData.nds, graphData.rls)
        }
    }, [graphData])

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
        const data = e.dataTransfer.getData("text/plain")
        if (data) {
            try {
                const parsedData = JSON.parse(data)
                handleOpenFormModal(parsedData.itemKey)
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
                {nodes?.length > 500 ? <Graph /> : <GraphReactForce />}
                {/* <GraphReactForce /> */}
            </Suspense>
            {/* <Graph /> */}
            {/* <GraphSigma /> */}
            <DragOverlay isDragging={isDraggingOver} />
            <div className='absolute w-10 right-3 top-3 h-min shadow-sm border rounded-full overflow-y-auto'>
                <Toolbar isLoading={isLoading} />
            </div>
            <CreateRelationDialog />
        </div>
    )
}

export default memo(GraphPanel)