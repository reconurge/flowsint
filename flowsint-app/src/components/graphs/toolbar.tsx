import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useConfirm } from '@/components/use-confirm-dialog'
import { cn } from '@/lib/utils'
import { useGraphControls } from '@/stores/graph-controls-store'
import { useGraphSaveStatus } from '@/stores/graph-save-status-store'
import { useGraphStore } from '@/stores/graph-store'
import {
  FunnelPlus,
  GitFork,
  GitPullRequestArrow,
  LassoSelect,
  Maximize,
  Merge,
  Minus,
  RotateCw,
  ZoomIn
} from 'lucide-react'
import { memo, useCallback } from 'react'
import { toast } from 'sonner'
import Filters from './filters'
import { SaveStatusIndicator } from './save-status-indicator'
import { Separator } from '../ui/separator'
import { ViewToggle } from './view-toggle'
import { NetworkIcon } from '../icons/network'
import { useKeyboard } from '@/hooks/use-keyboard'

// Tooltip wrapper component to avoid repetition
export const ToolbarButton = memo(function ToolbarButton({
  icon,
  tooltip,
  onClick,
  disabled = false,
  badge = null,
  toggled = false,
  showLabel = false
}: {
  icon: React.ReactNode
  tooltip: string | React.ReactNode
  onClick?: () => void
  disabled?: boolean
  badge?: number | null
  toggled?: boolean | null
  showLabel?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button
            onClick={onClick}
            disabled={disabled}
            variant="ghost"
            size={showLabel ? "sm" : "icon"}
            className={cn(
              'h-7 relative items-center shadow-none',
              !showLabel && "w-7",
              toggled &&
              'bg-primary/30 border-primary/40 text-primary hover:bg-primary/40 hover:text-primary'
            )}
          >
            {icon} {showLabel && <span className='hidden md:block'>{tooltip}</span>}
            {badge && (
              <span className="absolute -top-1 -right-2 !z-[500] bg-primary text-white text-[10px] rounded-full w-auto min-w-4.5 h-4.5 p-1 flex items-center justify-center">
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

  useKeyboard(
    "s",
    () => setIsLassoActive(true),
    () => setIsLassoActive(false),
  );

  const handleRefresh = useCallback(() => {
    try {
      refetchGraph()
    } catch (error) {
      toast.error('Failed to refresh graph data')
    }
  }, [refetchGraph])

  const handleApplyForceLayout = useCallback(async () => {

    const confirmed = await confirm({
      title: 'Apply force layout?',
      message: 'This will reset all node positions and regenerate them using the force-directed layout algorithm. Current positions will be lost.'
    })

    if (!confirmed) {
      return
    }

    try {
      regenerateLayout('force')
      toast.success('Force layout applied successfully')
    } catch (error) {
      toast.error(`Failed to apply layout: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [confirm, regenerateLayout])

  const handleApplyHierarchyLayout = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Apply hierarchy layout?',
      message: 'This will reset all node positions and regenerate them using the hierarchical layout algorithm. Current positions will be lost.'
    })

    if (!confirmed) {
      return
    }
    try {
      regenerateLayout('hierarchy')
      toast.success('Hierarchy layout applied successfully')
    } catch (error) {
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
    <div className='flex justify-between h-10 z-50 items-center gap-6 w-full border-b bg-card p-1 px-2'>
      <div className='flex h-full items-center gap-2'>
        <div className='flex gap-1'>
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
        </div>
        <Separator decorative orientation="vertical" />
        <div className='flex gap-1'>
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
        </div>
        <Separator decorative orientation="vertical" />
        <div className='flex gap-1'>
          <ToolbarButton
            icon={<LassoSelect className="h-4 w-4 opacity-70" />}
            tooltip={'Lasso select (hold S)'}
            onClick={handleLassoSelect}
            toggled={isLassoActive}
            disabled={view !== 'graph'}
          />
          <Filters>
            <ToolbarButton
              disabled={isLoading}
              icon={<FunnelPlus className={cn('h-4 w-4 opacity-70')} />}
              tooltip="Filters"
              showLabel
              toggled={hasFilters}
            />
          </Filters>
        </div>
        <Separator orientation="vertical" />
        <div className="flex items-center gap-1" >
          <>
            <ToolbarButton
              icon={<NetworkIcon className="h-4 w-4 opacity-70" />}
              tooltip={'Force layout'}
              onClick={handleApplyForceLayout}
              disabled={isLoading || view !== 'graph'}
            />
            <ToolbarButton
              icon={<GitFork strokeWidth={1.4} className="h-4 w-4 opacity-70 rotate-180" />}
              tooltip={'Hierarchy layout'}
              onClick={handleApplyHierarchyLayout}
              disabled={isLoading || view !== 'graph'}
            />
          </>
        </div>
        <Separator decorative orientation="vertical" />
        {/* Center: View Toggle Group */}
        <ViewToggle view={view} setView={setView} />
      </div>
      <div className='flex item-center gap-2'>
        <ToolbarButton
          onClick={handleRefresh}
          disabled={isLoading}
          icon={<RotateCw className={cn('h-4 w-4 opacity-70', isLoading && 'animate-spin')} />}
          tooltip="Refresh"
        />
        <SaveStatusIndicator status={saveStatus} />
      </div>
    </div >
  )
})