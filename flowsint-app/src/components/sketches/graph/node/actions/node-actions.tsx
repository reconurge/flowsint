import React, { memo, useCallback, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Sparkles, Plus, MoreHorizontal, Flag } from 'lucide-react'
import { useGraphStore } from '@/stores/graph-store'
import { useParams } from '@tanstack/react-router'
import { useConfirm } from '@/components/use-confirm-dialog'
import { toast } from 'sonner'
import { sketchService } from '@/api/sketch-service'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useLayoutStore } from '@/stores/layout-store'
import { GraphNode } from '@/types'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { cn } from '@/lib/utils'

const flagColors = {
  red: 'text-red-400 fill-red-200',
  orange: 'text-orange-400 fill-orange-200',
  blue: 'text-blue-400 fill-blue-200',
  green: 'text-green-400 fill-green-200',
  yellow: 'text-yellow-400 fill-yellow-200'
} as const

type FlagColor = keyof typeof flagColors

const NodeActions = memo(
  ({ node, setMenu }: { node: GraphNode; setMenu?: (menu: any | null) => void }) => {
    const { id: sketchId } = useParams({ strict: false })
    const { confirm } = useConfirm()
    const setOpenMainDialog = useGraphStore((state) => state.setOpenMainDialog)
    const setRelatedNodeToAdd = useGraphStore((state) => state.setRelatedNodeToAdd)
    const removeNodes = useGraphStore((s) => s.removeNodes)
    const toggleNodeSelection = useGraphStore((s) => s.toggleNodeSelection)
    const updateNode = useGraphStore((s) => s.updateNode)
    const openChat = useLayoutStore((s) => s.openChat)
    const settings = useGraphSettingsStore((s) => s.settings)

    const [flagValue, setFlagValue] = useState<FlagColor | null>(node.nodeFlag)

    useEffect(() => {
      setFlagValue(node.nodeFlag)
    }, [node.id, node.nodeFlag])

    const handleOpenMainDialog = useCallback(() => {
      setRelatedNodeToAdd(node)
      setOpenMainDialog(true)
      setMenu?.(null)
    }, [setOpenMainDialog, setMenu, node])

    const handleAskAI = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleNodeSelection(node, false)
        openChat()
        setMenu?.(null)
      },
      [node, toggleNodeSelection, openChat, setMenu]
    )

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

    const handleUpdateFlag = useCallback(
      async (value: FlagColor) => {
        const val = value === flagValue ? null : value
        node.nodeFlag = flagValue
        setFlagValue(val)
        try {
          updateNode(node.id, { nodeFlag: val })
          const body = JSON.stringify({
            nodeId: node.id,
            updates: { nodeFlag: val } as Partial<GraphNode>
          })
          await sketchService.updateNode(sketchId!, body)
        } catch (e) {
          console.log(e)
        }
      },
      [node.id, flagValue, updateNode, sketchId]
    )

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          <DropdownMenuItem onClick={handleOpenMainDialog}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Add relation
          </DropdownMenuItem>
          {Boolean(settings?.general?.showFlow?.value) && (
            <DropdownMenuItem onClick={handleAskAI}>
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Ask AI
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Flag className={cn('h-3.5 w-3.5 mr-2', flagValue ? flagColors[flagValue] : '')} />
              Flag
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <div className="flex gap-1 p-1">
                {(Object.keys(flagColors) as FlagColor[]).map((key) => (
                  <button
                    key={key}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUpdateFlag(key)
                    }}
                    className={cn(
                      'w-7 h-7 flex items-center justify-center rounded hover:bg-muted',
                      flagValue === key && 'bg-muted'
                    )}
                  >
                    <Flag className={cn('h-4 w-4', flagColors[key])} />
                  </button>
                ))}
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDeleteNode}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)

export default NodeActions
