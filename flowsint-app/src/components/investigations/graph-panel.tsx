import { sketchService } from '@/api/sketch-service'
import { useQuery } from '@tanstack/react-query'
import Graph from '../sketches/graph'
import { useEffect } from 'react'
import type { EdgeData } from '@/types'
import { useSketchStore } from '@/store/sketch-store'
import LoadingSpinner from '../shared/loader'
import SketchLayout from '../layout/sketch.layout'
import { useActiveTabId } from '@/hooks/active-tab-helper'
// Helper functions
const randomIntFromInterval = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

const getRandDate = (): Date => {
    return new Date(randomIntFromInterval(0, 10000000))
}
const GraphPanel = () => {
    const activeTabId = useActiveTabId()
    const updateGraphData = useSketchStore(state => state.updateGraphData)
    const { data, isLoading, error } = useQuery({
        queryKey: ['sketches', activeTabId],
        queryFn: () => {
            return sketchService.getById(activeTabId as string)
        },
        enabled: !!activeTabId,
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
            <Graph isLoading={isLoading} />
        </SketchLayout>
    )
}

export default GraphPanel