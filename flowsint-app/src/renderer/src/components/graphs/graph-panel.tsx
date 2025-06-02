import { useLoaderData } from '@tanstack/react-router'
import { useEffect, useRef, memo, useState } from 'react'
import Graph from '../sketches/graph'
import { useSketchStore } from '@/stores/sketch-store'
import { Toolbar } from '../sketches/toolbar'
import { cn } from '@/lib/utils'
import { ArrowDownToLineIcon } from 'lucide-react'
import { CreateRelationDialog } from './create-relation'

// Separate component for the drag overlay
const DragOverlay = memo(({ isDragging }: { isDragging: boolean }) => (
    <div
        className={cn(
            'absolute flex items-center justify-center inset-0 bg-primary/20 backdrop-blur-xs gap-1',
            'opacity-0 pointer-events-none transition-opacity duration-200',
            isDragging && 'opacity-100 pointer-events-auto'
        )}
    >
        <p className="font-medium">Drop here to add node</p>
        <ArrowDownToLineIcon className="opacity-60" />
    </div>
))
DragOverlay.displayName = 'DragOverlay'

const GraphPanel = () => {
    const graphPanelRef = useRef<HTMLDivElement>(null)
    const handleOpenFormModal = useSketchStore(s => s.handleOpenFormModal)
    const updateGraphData = useSketchStore(s => s.updateGraphData)
    const { sketch, graphData } = useLoaderData({
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
            <Graph isLoading={false} />
            <DragOverlay isDragging={isDraggingOver} />
            <div className='absolute w-10 right-3 top-3 h-min shadow-sm border rounded-full overflow-y-auto'>
                <Toolbar />
            </div>
            <CreateRelationDialog />
        </div>
    )
}

export default memo(GraphPanel)