import { memo, useRef, useMemo, useCallback } from 'react'
import { sketchService } from '@/api/sketch-service'
import { useQuery } from '@tanstack/react-query'
import ForceGraphViewer from '../graph-viewer'
import Loader from '@/components/loader'
import { GraphNode } from '@/types'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const NeighborsGraph = memo(
  ({
    sketchId,
    currentNode,
    nodeLength
  }: {
    sketchId: string
    currentNode: GraphNode
    nodeLength: number
  }) => {
    const containerRef = useRef<HTMLDivElement>(null)

    const {
      data: neighborsData,
      isLoading,
      error,
      refetch
    } = useQuery({
      queryKey: ['neighbors', sketchId, currentNode.id, nodeLength],
      queryFn: () => sketchService.getNodeNeighbors(sketchId, currentNode.id)
    })

    // omit x and y positions to let the GraphViewer manange the forces
    const nodes = useMemo(
      () =>
        neighborsData?.nds.map(
          ({ id, nodeType, nodeColor, nodeIcon, nodeLabel, nodeImage, nodeShape }: GraphNode) => ({
            id,
            nodeType,
            nodeColor,
            nodeIcon,
            nodeLabel,
            nodeImage,
            nodeShape
          })
        ),
      [neighborsData?.nds]
    )
    const handleRefetch = useCallback(() => {
      refetch()
    }, [])

    if (error)
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Could not load neighbors.
        </div>
      )
    return (
      <div ref={containerRef} className="overflow-hidden bg-background relative h-full w-full">
        {isLoading ? (
          <div className="flex items-center justify-center grow h-full">
            <Loader />
          </div>
        ) : (
          <>
            <div className="top-0 left-0 bg-card/60 backdrop-blur z-10 p-1 rounded-br-lg absolute text-sm flex gap-1">
              <span className="font-semibold">{neighborsData.nds.length - 1}</span>
              <span className="opacity-70">neighbor(s)</span>
            </div>

            <div className="top-.5 p-1 right-8 bg-card/60 backdrop-blur z-10 rounded-br-lg absolute text-sm flex gap-1">
              <Button onClick={handleRefetch} variant={'ghost'} size={'icon'} className="h-6 w-6">
                <RotateCcw className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </div>
            <ForceGraphViewer
              nodes={nodes}
              edges={neighborsData.rls}
              onNodeClick={() => {}}
              onNodeRightClick={() => {}}
              onBackgroundClick={() => {}}
              showLabels={true}
              showIcons={true}
              backgroundColor="transparent"
              instanceId="neighbors"
              allowForces={true}
              autoZoomOnNode={false}
              showMinimap={false}
              showMinimalControls={true}
            />
          </>
        )}
      </div>
    )
  }
)

export default NeighborsGraph
