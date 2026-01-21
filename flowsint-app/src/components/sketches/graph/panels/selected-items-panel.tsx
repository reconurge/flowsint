import React, { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Sparkles, XIcon, Rocket } from 'lucide-react'
import { useGraphStore } from '@/stores/graph-store'
import { useConfirm } from '@/components/use-confirm-dialog'
import { toast } from 'sonner'
import { sketchService } from '@/api/sketch-service'
import { GraphNode } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useLayoutStore } from '@/stores/layout-store'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import type { ItemType } from '@/stores/node-display-settings'
import { Badge } from '@/components/ui/badge'
import LaunchFlow from '../../launch-enricher'
import { TypeBadge } from '@/components/type-badge'
import { useParams } from '@tanstack/react-router'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
const SelectedItemsPanel = () => {
  const selectedNodes = useGraphStore((s) => s.selectedNodes)

  return (
    <div className="w-full flex flex-col h-full">
      <div className="p-2 flex items-center justify-between border-b">
        <div className="ml-2 text-sm truncate text-ellipsis">
          <span className="font-semibold">{selectedNodes.length}</span> selected items
        </div>
        <ActionBar />
      </div>
      <div className="grow overflow-y-auto">
        <SelectedList />
      </div>
    </div>
  )
}

export default memo(SelectedItemsPanel)

const SelectedNodeItem = memo(({ node }: { node: GraphNode; color: string }) => {
  return (
    <Badge
      variant="outline"
      className="flex w-full items-center justify-between text-left border border-border gap-1.5 text-xs p-2 py-1.5"
    >
      <span className="inline-flex items-center gap-2 truncate text-ellipsis">
        <span className="truncate text-ellipsis">{node.nodeLabel || 'Unknown'}</span>
      </span>
      <TypeBadge type={node?.nodeType} />
    </Badge>
  )
})

export const SelectedList = () => {
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const colors = useNodesDisplaySettings((s) => s.colors)
  const displayItems = selectedNodes?.slice(0, 10) || []
  const remainingCount = selectedNodes?.length ? Math.max(0, selectedNodes.length - 10) : 0
  return (
    <div className="flex flex-col gap-1.5 p-1">
      {displayItems.map((item: GraphNode, index: number) => {
        const color = colors[item.nodeType as ItemType] ?? '#999999'
        return <SelectedNodeItem key={index} node={item} color={color} />
      })}
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className="flex w-full items-center justify-between text-left border border-border gap-1.5 text-xs p-2 py-1.5"
        >
          <span className="flex items-center gap-2 truncate text-ellipsis">
            <span className="truncate text-ellipsis">{remainingCount}+ other</span>
          </span>
        </Badge>
      )}
    </div>
  )
}

const ActionBar = () => {
  const { id: sketchId } = useParams({ strict: false })
  const { confirm } = useConfirm()
  const selectedNodes = useGraphStore((s) => s.selectedNodes)
  const removeNodes = useGraphStore((s) => s.removeNodes)
  const openChat = useLayoutStore((s) => s.openChat)
  const clearSelectedNodes = useGraphStore((s) => s.clearSelectedNodes)
  const settings = useGraphSettingsStore((s) => s.settings)


  // Ask AI dialog
  const handleAskAI = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      openChat()
    },
    [openChat]
  )

  // Delete node
  const handleDeleteNodes = useCallback(async () => {
    if (!selectedNodes.length || !sketchId) return
    if (
      !(await confirm({
        title: `You are about to delete ${selectedNodes.length} node(s).`,
        message: 'The action is irreversible.'
      }))
    )
      return

    toast.promise(
      (async () => {
        removeNodes(selectedNodes.map((n) => n.id))
        clearSelectedNodes()
        return sketchService.deleteNodes(
          sketchId as string,
          JSON.stringify({ nodeIds: selectedNodes.map((n) => n.id) })
        )
      })(),
      {
        loading: `Deleting ${selectedNodes.length} node(s)...`,
        success: 'Nodes deleted successfully.',
        error: 'Failed to delete selected nodes.'
      }
    )
  }, [selectedNodes, confirm, removeNodes, clearSelectedNodes, sketchId])

  const type = selectedNodes[0].nodeType
  const isSametype = (node: GraphNode) => node.nodeType === type
  const shareSameType = selectedNodes.every(isSametype)
  const values = !shareSameType ? [] : selectedNodes.map((node: GraphNode) => node.id)

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        {Boolean(settings?.general?.showFlow?.value) &&
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={handleAskAI}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted opacity-70 hover:opacity-100"
                >
                  <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ask AI</p>
            </TooltipContent>
          </Tooltip>}
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedNodes.length === 0}
                className="h-6 w-6 p-0 relative text-destructive hover:text-destructive"
                onClick={handleDeleteNodes}
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                {selectedNodes.length > 0 && (
                  <span className="absolute -top-2 -right-2 z-50 bg-primary text-white text-[10px] rounded-full w-auto min-w-4.5 h-4.5 p-1 flex items-center justify-center">
                    {selectedNodes.length}
                  </span>
                )}
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete {selectedNodes.length} nodes</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="ml-2">
              <LaunchFlow disabled={!shareSameType} values={values} type={type}>
                <Button disabled={!shareSameType} size={'sm'} className="rounded-full h-7">
                  <Rocket className="h-3 w-3" strokeWidth={2} />({selectedNodes.length})
                </Button>
              </LaunchFlow>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {!shareSameType ? (
              <p>All selected items are not the same type</p>
            ) : (
              <p>Launch enricher</p>
            )}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedNodes.length === 0}
                className="h-6 w-6"
                onClick={clearSelectedNodes}
              >
                <XIcon className="h-5 w-5" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clear selection</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
