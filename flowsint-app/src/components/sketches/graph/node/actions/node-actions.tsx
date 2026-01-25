import React, { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Sparkles, Plus } from 'lucide-react'
import { useGraphStore } from '@/stores/graph-store'
import { useParams } from '@tanstack/react-router'
import { useConfirm } from '@/components/use-confirm-dialog'
import { toast } from 'sonner'
import { sketchService } from '@/api/sketch-service'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useLayoutStore } from '@/stores/layout-store'
import { GraphNode } from '@/types'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { NodeFlag } from './flag'

const NodeActions = memo(
  ({ node, setMenu }: { node: GraphNode; setMenu?: (menu: any | null) => void }) => {
    const { id: sketchId } = useParams({ strict: false })
    const { confirm } = useConfirm()
    const setOpenMainDialog = useGraphStore((state) => state.setOpenMainDialog)
    const setRelatedNodeToAdd = useGraphStore((state) => state.setRelatedNodeToAdd)
    const removeNodes = useGraphStore((s) => s.removeNodes)
    const toggleNodeSelection = useGraphStore((s) => s.toggleNodeSelection)
    const openChat = useLayoutStore((s) => s.openChat)
    const settings = useGraphSettingsStore((s) => s.settings)

    // Add relation dialog
    const handleOpenMainDialog = useCallback(() => {
      setRelatedNodeToAdd(node)
      setOpenMainDialog(true)
      setMenu?.(null)
    }, [setOpenMainDialog, setMenu, node])

    // Ask AI dialog
    const handleAskAI = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleNodeSelection(node, false)
        openChat()
        setMenu?.(null)
      },
      [node, toggleNodeSelection, openChat, setMenu]
    )

    // Delete node
    const handleDeleteNode = async () => {
      if (!node.id || !sketchId) return
      if (
        !(await confirm({
          title: `You are about to delete this node ?`,
          message: 'The action is irreversible.'
        }))
      )
        return
      toast.promise(
        (async () => {
          removeNodes([node.id])
          return sketchService.deleteNodes(sketchId, JSON.stringify({ nodeIds: [node.id] }))
        })(),
        {
          loading: `Deleting ${node.nodeProperties.label}...`,
          success: 'Node deleted successfully.',
          error: 'Failed to delete node.'
        }
      )
    }
    return (
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <NodeFlag node={node} sketchId={sketchId as string} />
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={handleOpenMainDialog}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-70"
                >
                  <Plus className="h-3.5! w-3.5! opacity-70" strokeWidth={2} />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add relation</p>
            </TooltipContent>
          </Tooltip>
          {Boolean(settings?.general?.showFlow?.value) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    onClick={handleAskAI}
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 hover:bg-muted opacity-70 hover:opacity-100"
                  >
                    <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ask AI</p>
              </TooltipContent>
            </Tooltip>
          )}
          {/*<Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={handleEditNode}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted opacity-70 hover:opacity-100"
                >
                  <Pencil className="h-3 w-3" strokeWidth={1.5} />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit node</p>
            </TooltipContent>
          </Tooltip>*/}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted opacity-70 hover:opacity-100 text-destructive hover:text-destructive"
                  onClick={handleDeleteNode}
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete node</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }
)

export default NodeActions
