import { useLoaderData } from '@tanstack/react-router'
import { useEffect, memo, useState, lazy, Suspense } from 'react'
import { useGraphStore } from '@/stores/graph-store'
import { Toolbar } from './toolbar'
import { cn } from '@/lib/utils'
import { ArrowDownToLineIcon } from 'lucide-react'
import { CreateRelationDialog } from './create-relation'
import GraphLoader from './graph/components/graph-loader'
import Loader from '../loader'
import { useGraphControls } from '@/stores/graph-controls-store'
import NodesTable from '../table'
import { findActionItemByKey } from '@/lib/action-items'
import { useActionItems } from '@/hooks/use-action-items'
import { toast } from 'sonner'
import MapPanel from '../map/map-panel'
import NewActions from './add-item-dialog'
import GraphMain from './graph/components/graph-main'
import Settings, { KeyboardShortcuts } from './settings/settings'
import { type GraphNode, type GraphEdge } from '@/types'
import { MergeDialog } from './graph/actions/merge-nodes'
import { useGraphRefresh } from '@/hooks/use-graph-refresh'
const RelationshipsTable = lazy(() => import('@/components/table/relationships-view'))

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
  graphData: { nds: GraphNode[]; rls: GraphEdge[] } | null
  isLoading: boolean
  isRefetching: boolean
}

const GraphPanel = ({ graphData, isLoading }: GraphPanelProps) => {
  const handleOpenFormModal = useGraphStore((s) => s.handleOpenFormModal)
  const view = useGraphControls((s) => s.view)
  const updateGraphData = useGraphStore((s) => s.updateGraphData)
  const setFilters = useGraphStore((s) => s.setFilters)
  const filters = useGraphStore((s) => s.filters)
  const { actionItems, isLoading: isLoadingActionItems } = useActionItems()

  const { params, sketch } = useLoaderData({
    from: '/_auth/dashboard/investigations/$investigationId/$type/$id'
  })
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // Dedicated hook for graph refresh on transform completion
  useGraphRefresh(params.id)

  useEffect(() => {
    if (graphData?.nds && graphData?.rls) {
      updateGraphData(graphData.nds, graphData.rls)
      const types = new Set(graphData.nds.map((n) => n.nodeType))
      setFilters({
        ...filters,
        types: Array.from(types).map((t) => ({
          type: t,
          checked: true
        }))
      })
    }
  }, [graphData?.nds, graphData?.rls, setFilters])

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
      toast.error('Sorry, an error occured. Please try again.')
      return
    }
    const data = e.dataTransfer.getData('text/plain')
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
          <h2 className="text-lg font-semibold text-destructive mb-2">Error loading graph</h2>
          <p className="text-muted-foreground">Could not load graph data. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-full w-full flex flex-col relative outline-2 outline-transparent bg-background"
    >
      <Toolbar isLoading={isLoading} />
      <Suspense
        fallback={
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-center flex items-center gap-2">
              <Loader />
            </div>
          </div>
        }
      >
        <div className="flex-1 min-h-0">
          {view === 'graph' && <GraphMain />}
          {view === 'table' && <NodesTable />}
          {view === 'map' && <MapPanel />}
          {view === 'relationships' && <RelationshipsTable />}
        </div>
      </Suspense>
      <DragOverlay isDragging={isDraggingOver} />
      <NewActions />
      <CreateRelationDialog />
      <MergeDialog />
      <Settings />
      <KeyboardShortcuts />
    </div>
  )
}

export default memo(GraphPanel)
