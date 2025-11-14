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
import { useConfirm } from '@/components/use-confirm-dialog'

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
              'h-8 w-8 relative shadow-none',
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
  const { confirm } = useConfirm()
  const view = useGraphControls((s) => s.view)
  const setView = useGraphControls((s) => s.setView)
  const zoomToFit = useGraphControls((s) => s.zoomToFit)
  const zoomIn = useGraphControls((s) => s.zoomIn)
  const zoomOut = useGraphControls((s) => s.zoomOut)
  const regenerateLayout = useGraphControls((s) => s.regenerateLayout)
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

  const handleRegenerateForceLayout = useCallback(async () => {
    console.log('[Toolbar] handleRegenerateForceLayout called')
    console.log('[Toolbar] regenerateLayout function:', regenerateLayout)
    console.log('[Toolbar] regenerateLayout is function?', typeof regenerateLayout === 'function')

    const confirmed = await confirm({
      title: 'Regenerate force layout?',
      message: 'This will reset all node positions and regenerate them using the force-directed layout algorithm. Current positions will be lost.'
    })

    if (!confirmed) {
      console.log('[Toolbar] User cancelled regeneration')
      return
    }

    console.log('[Toolbar] Calling regenerateLayout with force')
    try {
      regenerateLayout('force')
      console.log('[Toolbar] regenerateLayout completed successfully')
      toast.success('Force layout regenerated successfully')
    } catch (error) {
      console.error('[Toolbar] Failed to regenerate layout:', error)
      toast.error(`Failed to regenerate layout: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [confirm, regenerateLayout])

  const handleRegenerateHierarchyLayout = useCallback(async () => {
    console.log('[Toolbar] handleRegenerateHierarchyLayout called')

    const confirmed = await confirm({
      title: 'Regenerate hierarchy layout?',
      message: 'This will reset all node positions and regenerate them using the hierarchical layout algorithm. Current positions will be lost.'
    })

    if (!confirmed) {
      console.log('[Toolbar] User cancelled regeneration')
      return
    }

    console.log('[Toolbar] Calling regenerateLayout with hierarchy')
    try {
      regenerateLayout('hierarchy')
      console.log('[Toolbar] regenerateLayout completed successfully')
      toast.success('Hierarchy layout regenerated successfully')
    } catch (error) {
      console.error('[Toolbar] Failed to regenerate layout:', error)
      toast.error(`Failed to regenerate layout: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [confirm, regenerateLayout])

  const handleTableLayout = useCallback(() => {
    setView('table')
  }, [setView])

  const handleMapLayout = useCallback(() => {
    setView('map')
  }, [setView])

  const handleRelationshipsLayout = useCallback(() => {
    setView('relationships')
  }, [setView])

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
    <div className="flex w-full justify-between gap-2 items-center">
      <div className="flex items-center gap-2">
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
            disabled={view !== 'force' || isLassoActive}
          />
          <ToolbarButton
            icon={<Minus className="h-4 w-4 opacity-70" />}
            tooltip="Zoom Out"
            onClick={zoomOut}
            disabled={view !== 'force' || isLassoActive}
          />
          <ToolbarButton
            icon={<Maximize className="h-4 w-4 opacity-70" />}
            tooltip="Fit to View"
            onClick={zoomToFit}
            disabled={view !== 'force' || isLassoActive}
          />
          <ToolbarButton
            icon={<LassoSelect className="h-4 w-4 opacity-70" />}
            tooltip={'Lasso select'}
            onClick={handleLassoSelect}
            toggled={isLassoActive}
            disabled={view !== 'force'}
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
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <ToolbarButton
            icon={<GitFork className="h-4 w-4 opacity-70 rotate-180" />}
            tooltip={'Regenerate hierarchy layout'}
            onClick={handleRegenerateHierarchyLayout}
            disabled={isLoading}
          />
          <ToolbarButton
            icon={<Waypoints className="h-4 w-4 opacity-70" />}
            tooltip={'Regenerate force layout'}
            onClick={handleRegenerateForceLayout}
            disabled={isLoading}
          />
          <ToolbarButton
            icon={<List className="h-4 w-4 opacity-70" />}
            tooltip={'Table view'}
            toggled={['table'].includes(view)}
            onClick={handleTableLayout}
          />
          <ToolbarButton
            icon={<ArrowRightLeft className="h-4 w-4 opacity-70" />}
            tooltip={'Relationships view'}
            toggled={['relationships'].includes(view)}
            onClick={handleRelationshipsLayout}
          />
          <ToolbarButton
            icon={<MapPin className="h-4 w-4 opacity-70" />}
            tooltip={'Map view'}
            toggled={['map'].includes(view)}
            onClick={handleMapLayout}
          />
        </TooltipProvider>
      </div>
    </div>
  )
})