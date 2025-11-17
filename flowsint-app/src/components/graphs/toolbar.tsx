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
  Merge,
  Network
} from 'lucide-react'
import { memo, useCallback } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Filters from './filters'
import { useGraphStore } from '@/stores/graph-store'
import { useConfirm } from '@/components/use-confirm-dialog'
import { useGraphSaveStatus } from '@/stores/graph-save-status-store'
import { SaveStatusIndicator } from './save-status-indicator'

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
  const saveStatus = useGraphSaveStatus((s) => s.saveStatus)

  const handleRefresh = useCallback(() => {
    try {
      refetchGraph()
    } catch (error) {
      toast.error('Failed to refresh graph data')
    }
  }, [refetchGraph])

  const handleApplyForceLayout = useCallback(async () => {
    console.log('[Toolbar] handleApplyForceLayout called')

    const confirmed = await confirm({
      title: 'Apply force layout?',
      message: 'This will reset all node positions and regenerate them using the force-directed layout algorithm. Current positions will be lost.'
    })

    if (!confirmed) {
      console.log('[Toolbar] User cancelled layout change')
      return
    }

    console.log('[Toolbar] Calling regenerateLayout with force')
    try {
      regenerateLayout('force')
      console.log('[Toolbar] Force layout applied successfully')
      toast.success('Force layout applied successfully')
    } catch (error) {
      console.error('[Toolbar] Failed to apply layout:', error)
      toast.error(`Failed to apply layout: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [confirm, regenerateLayout])

  const handleApplyHierarchyLayout = useCallback(async () => {
    console.log('[Toolbar] handleApplyHierarchyLayout called')

    const confirmed = await confirm({
      title: 'Apply hierarchy layout?',
      message: 'This will reset all node positions and regenerate them using the hierarchical layout algorithm. Current positions will be lost.'
    })

    if (!confirmed) {
      console.log('[Toolbar] User cancelled layout change')
      return
    }

    console.log('[Toolbar] Calling regenerateLayout with hierarchy')
    try {
      regenerateLayout('hierarchy')
      console.log('[Toolbar] Hierarchy layout applied successfully')
      toast.success('Hierarchy layout applied successfully')
    } catch (error) {
      console.error('[Toolbar] Failed to apply layout:', error)
      toast.error(`Failed to apply layout: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [confirm, regenerateLayout])

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
      <div className='absolute flex gap-2 left-2 top-2'>
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
      </div >

      {/* Center: View Toggle Group */}
      <div className="flex-1 flex border rounded-md justify-center absolute left-1/2 top-1.5 -translate-x-1/2" >
        <div className="flex items-center bg-muted/40 p-1 gap-0.5 rounded-md">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('graph')}
                  className={cn(
                    'h-7 px-2 rounded-sm',
                    view === 'graph'
                      ? 'bg-background text-foreground border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  <Network className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Graph view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('table')}
                  className={cn(
                    'h-7 px-2 rounded-sm',
                    view === 'table'
                      ? 'bg-background text-foreground border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Table view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('relationships')}
                  className={cn(
                    'h-7 px-2 rounded-sm',
                    view === 'relationships'
                      ? 'bg-background text-foreground border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Relationships view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('map')}
                  className={cn(
                    'h-7 px-2 rounded-sm',
                    view === 'map'
                      ? 'bg-background text-foreground border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Map view</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div >

      < div className="flex items-center gap-2 absolute right-2 top-2" >
        <TooltipProvider>
          {view === 'graph' && (
            <>
              <ToolbarButton
                icon={<Waypoints className="h-4 w-4 opacity-70" />}
                tooltip={'Force layout'}
                onClick={handleApplyForceLayout}
                disabled={isLoading}
              />
              <ToolbarButton
                icon={<GitFork className="h-4 w-4 opacity-70 rotate-180" />}
                tooltip={'Hierarchy layout'}
                onClick={handleApplyHierarchyLayout}
                disabled={isLoading}
              />
            </>
          )}
        </TooltipProvider>
        <SaveStatusIndicator status={saveStatus} />
      </div >
    </ >
  )
})