import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useGraphControls } from '@/stores/graph-controls-store'
import {
  Maximize,
  Minus,
  ZoomIn,
  RotateCw,
  Waypoints,
  MapPin,
  List,
  GitFork,
  ArrowRightLeft,
  FunnelPlus,
  GitPullRequestArrow,
  LassoSelect,
  Merge
} from 'lucide-react'
import { memo, useCallback } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Filters from './filters'
import { useGraphStore } from '@/stores/graph-store'

// Tooltip wrapper component to avoid repetition
export const ToolbarButton = memo(function ToolbarButton({
  icon,
  tooltip,
  onClick,
  disabled = false,
  badge = null,
  toggled = false
}: {
  icon: React.ReactNode
  tooltip: string | React.ReactNode
  onClick?: () => void
  disabled?: boolean
  badge?: number | null
  toggled?: boolean | null
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button
            onClick={onClick}
            disabled={disabled}
            variant="outline"
            size="icon"
            className={cn(
              'h-8 w-8 relative shadow-none bg-card',
              toggled &&
              'bg-primary/30 border-primary text-primary hover:bg-primary/40 hover:text-primary'
            )}
          >
            {icon}
            {badge && (
              <span className="absolute -top-2 -right-2 z-50 bg-primary text-white text-[10px] rounded-full w-auto min-w-4.5 h-4.5 p-1 flex items-center justify-center">
                {badge}
              </span>
            )}
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
})
export const Toolbar = memo(function Toolbar({ isLoading }: { isLoading: boolean }) {
  const view = useGraphControls((s) => s.view)
  const setView = useGraphControls((s) => s.setView)
  const layoutMode = useGraphControls((s) => s.layoutMode)
  const setLayoutMode = useGraphControls((s) => s.setLayoutMode)
  const zoomToFit = useGraphControls((s) => s.zoomToFit)
  const zoomIn = useGraphControls((s) => s.zoomIn)
  const zoomOut = useGraphControls((s) => s.zoomOut)
  const onLayout = useGraphControls((s) => s.onLayout)
  const refetchGraph = useGraphControls((s) => s.refetchGraph)
  const isLassoActive = useGraphControls((s) => s.isLassoActive)
  const setIsLassoActive = useGraphControls((s) => s.setIsLassoActive)
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const setOpenAddRelationDialog = useGraphStore((state) => state.setOpenAddRelationDialog)
  const setOpenMergeDialog = useGraphStore((state) => state.setOpenMergeDialog)
  const filters = useGraphStore((s) => s.filters)

  const handleRefresh = useCallback(() => {
    try {
      refetchGraph()
    } catch (error) {
      toast.error('Failed to refresh graph data')
    }
  }, [refetchGraph])

  // View handlers
  const handleGraphView = useCallback(() => {
    setView('graph')
  }, [setView])

  const handleTableView = useCallback(() => {
    setView('table')
  }, [setView])

  const handleMapView = useCallback(() => {
    setView('map')
  }, [setView])

  const handleRelationshipsView = useCallback(() => {
    setView('relationships')
  }, [setView])

  // Layout handlers (only active when in graph view)
  const handleForceLayout = useCallback(() => {
    setLayoutMode('force')
    setTimeout(() => zoomToFit(), 500)
  }, [setLayoutMode, zoomToFit])

  const handleDagreLayout = useCallback(() => {
    setLayoutMode('dagre')
    onLayout && onLayout('dagre-tb')
    setTimeout(() => zoomToFit(), 200)
  }, [onLayout, setLayoutMode, zoomToFit])

  const handleOpenAddRelationDialog = useCallback(() => {
    setOpenAddRelationDialog(true)
  }, [setOpenAddRelationDialog])

  const handleOpenMergeDialog = useCallback(() => {
    setOpenMergeDialog(true)
  }, [setOpenMergeDialog])

  const handleLassoSelect = useCallback(() => {
    setIsLassoActive(!isLassoActive)
  }, [setIsLassoActive, isLassoActive])

  const areExactlyTwoSelected = selectedNodes.length === 2
  const areMergeable =
    selectedNodes.length > 1 &&
    selectedNodes.every((n) => n.data.type === selectedNodes[0].data.type)
  const hasFilters = !(
    filters.types.every((t) => t.checked) || filters.types.every((t) => !t.checked)
  )

  return (
    <>
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <TooltipProvider>
          <ToolbarButton
            icon={<GitPullRequestArrow className="h-4 w-4 opacity-70" />}
            tooltip="Connect"
            onClick={handleOpenAddRelationDialog}
            disabled={!areExactlyTwoSelected}
            badge={areExactlyTwoSelected ? 2 : null}
          />
          <ToolbarButton
            icon={<Merge className="h-4 w-4 opacity-70" />}
            tooltip="Merge"
            onClick={handleOpenMergeDialog}
            disabled={!areMergeable}
            badge={areMergeable ? selectedNodes.length : null}
          />
          <ToolbarButton
            icon={<ZoomIn className="h-4 w-4 opacity-70" />}
            tooltip="Zoom In"
            onClick={zoomIn}
            disabled={view !== 'graph' || isLassoActive}
          />
          <ToolbarButton
            icon={<Minus className="h-4 w-4 opacity-70" />}
            tooltip="Zoom Out"
            onClick={zoomOut}
            disabled={view !== 'graph' || isLassoActive}
          />
          <ToolbarButton
            icon={<Maximize className="h-4 w-4 opacity-70" />}
            tooltip="Fit to View"
            onClick={zoomToFit}
            disabled={view !== 'graph' || isLassoActive}
          />
          <ToolbarButton
            icon={<LassoSelect className="h-4 w-4 opacity-70" />}
            tooltip={'Lasso select'}
            onClick={handleLassoSelect}
            toggled={isLassoActive}
            disabled={view !== 'graph'}
          />
          <Filters>
            <ToolbarButton
              disabled={isLoading}
              icon={<FunnelPlus className={cn('h-4 w-4 opacity-70')} />}
              tooltip="Filters"
              toggled={hasFilters}
            />
          </Filters>
          <ToolbarButton
            onClick={handleRefresh}
            disabled={isLoading}
            icon={<RotateCw className={cn('h-4 w-4 opacity-70', isLoading && 'animate-spin')} />}
            tooltip="Refresh"
          />
        </TooltipProvider>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <TooltipProvider>
          {/* Layout buttons - only visible when in graph view */}
          {view === 'graph' && (
            <>
              <ToolbarButton
                icon={<GitFork className="h-4 w-4 opacity-70 rotate-180" />}
                tooltip="Dagre Layout"
                toggled={layoutMode === 'dagre'}
                onClick={handleDagreLayout}
              />
              <ToolbarButton
                icon={<Waypoints className="h-4 w-4 opacity-70" />}
                tooltip="Force Layout"
                toggled={layoutMode === 'force'}
                onClick={handleForceLayout}
              />
            </>
          )}

          {/* View buttons */}
          <ToolbarButton
            icon={<Waypoints className="h-4 w-4 opacity-70" />}
            tooltip="Graph view"
            toggled={view === 'graph'}
            onClick={handleGraphView}
          />
          <ToolbarButton
            icon={<List className="h-4 w-4 opacity-70" />}
            tooltip="Table view"
            toggled={view === 'table'}
            onClick={handleTableView}
          />
          <ToolbarButton
            icon={<ArrowRightLeft className="h-4 w-4 opacity-70" />}
            tooltip="Relationships view"
            toggled={view === 'relationships'}
            onClick={handleRelationshipsView}
          />
          <ToolbarButton
            icon={<MapPin className="h-4 w-4 opacity-70" />}
            tooltip="Map view"
            toggled={view === 'map'}
            onClick={handleMapView}
          />
        </TooltipProvider>
      </div>
    </>
  )
})
