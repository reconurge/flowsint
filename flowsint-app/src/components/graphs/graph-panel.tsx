import { sketchService } from '@/api/sketch-service'
import { useQuery } from '@tanstack/react-query'
import Graph from '../sketches/graph'
import { useEffect, useRef, useState } from 'react'
import type { EdgeData } from '@/types'
import { useSketchStore } from '@/store/sketch-store'
import LoadingSpinner from '../shared/loader'
import SketchLayout from '../layout/sketch.layout'
import { useParams } from '@tanstack/react-router'
import { ArrowDownToLineIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreateRelationDialog } from './create-relation'
// Helper functions
const randomIntFromInterval = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

const getRandDate = (): Date => {
    return new Date(randomIntFromInterval(0, 10000000))
}
const GraphPanel = () => {
    const { investigationId, id } = useParams({ from: "/_auth/dashboard/investigations/$investigationId/$type/$id" })
    const [isDraggingOver, setIsDraggingOver] = useState(false)
    const handleOpenFormModal = useSketchStore(s => s.handleOpenFormModal)
    const graphPanelRef = useRef<HTMLDivElement>(null)

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

    const updateGraphData = useSketchStore(state => state.updateGraphData)
    const { data, isLoading, error } = useQuery({
        queryKey: [investigationId, 'sketches', id],
        queryFn: () => {
            return sketchService.getGraphDataById(id as string)
        },
        enabled: !!id,
    })
    useEffect(() => {
        if (!data || isLoading) return

        const processedEdges = data.rls ? data.rls.map((edge: EdgeData) => ({
            ...edge,
            source: edge.from,
            target: edge.to,
            id: `${edge.from}-${edge.to}`,
            date: getRandDate()
        })) : undefined

        // Update both in a single operation
        updateGraphData(data.nds, processedEdges)
    }, [data, isLoading, updateGraphData])

    if (isLoading) return <div className='h-full w-full flex items-center justify-center gap-2'><LoadingSpinner /> Loading sketch...</div>
    if (error) return <div className='h-full w-full flex items-center justify-center gap-2'>Error: {(error as Error).message}</div>

    return (
        <SketchLayout>
            <div
                ref={graphPanelRef}
                className={cn('h-full w-full relative outline-2 outline-transparent bg-background')} onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <Graph isLoading={isLoading} />
                {isDraggingOver &&
                    <div className={cn('absolute flex items-center justify-center inset-0 bg-primary/5 backdrop-blur-xs gap-1')}>
                        <p className="font-medium">Drop here to add node</p> <ArrowDownToLineIcon className="opacity-60" />
                    </div>
                }
            </div>
            <CreateRelationDialog />
        </SketchLayout>
    )
}

export default GraphPanel