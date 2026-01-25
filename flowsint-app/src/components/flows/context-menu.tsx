import { JSX, useCallback } from 'react'
import { Pencil, Trash } from 'lucide-react'
import BaseContextMenu from '@/components/xyflow/context-menu'
import { FlowNode, useFlowStore } from '@/stores/flow-store'

interface GraphContextMenuProps {
  node: FlowNode
  top?: number
  left?: number
  right?: number
  bottom?: number
  rawTop?: number
  rawLeft?: number
  wrapperWidth: number
  wrapperHeight: number
  setMenu: (menu: unknown | null) => void
  [key: string]: unknown
}

export default function ContextMenu({
  node,
  top,
  left,
  right,
  bottom,
  wrapperWidth,
  wrapperHeight,
  setMenu,
  ...props
}: GraphContextMenuProps): JSX.Element {
  const setOpenParamsDialog = useFlowStore((s) => s.setOpenParamsDialog)
  const deleteNode = useFlowStore((s) => s.deleteNode)

  const handleOpenParamsModal = useCallback(() => {
    setOpenParamsDialog(true, node as FlowNode)
    setMenu(null)
  }, [setOpenParamsDialog, node, setMenu])

  const handleDeleteFlow = useCallback(() => {
    deleteNode(node.id as string)
    setMenu(null)
  }, [deleteNode, node.id, setMenu])

  return (
    <BaseContextMenu
      top={top}
      left={left}
      right={right}
      bottom={bottom}
      wrapperWidth={wrapperWidth}
      wrapperHeight={wrapperHeight}
      {...props}
    >
      {/* Header with title and action buttons */}
      <div className="px-3 py-2 border-b gap-1 border-border flex items-center justify-between shrink-0">
        <div className="flex text-xs items-center gap-1 truncate">
          <span className="block truncate">{node.data.name}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 p-1">
        {/* Enrichers list */}
        <button
          onClick={handleOpenParamsModal}
          className="w-full flex items-center gap-2 p-2 rounded-sm hover:bg-muted text-left transition-colors"
        >
          <Pencil className="h-4 w-4 opacity-60" /> Edit
        </button>
        <button
          onClick={handleDeleteFlow}
          className="w-full flex items-center gap-2 p-2 rounded-sm hover:bg-muted text-left transition-colors"
        >
          <Trash className="h-4 w-4 text-red-500 opacity-60" /> Delete
        </button>
      </div>
    </BaseContextMenu>
  )
}
