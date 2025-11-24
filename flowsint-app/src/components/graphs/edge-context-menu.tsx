import React, { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { GraphEdge } from '@/types'
import BaseContextMenu from '@/components/xyflow/context-menu'
import { CopyButton } from '../copy'
import { sketchService } from '@/api/sketch-service'
import { useParams } from '@tanstack/react-router'
import { useGraphStore } from '@/stores/graph-store'
import { useConfirm } from '@/components/use-confirm-dialog'
import { toast } from 'sonner'

interface EdgeContextMenuProps {
  edge?: GraphEdge
  edges?: GraphEdge[]
  top?: number
  left?: number
  right?: number
  bottom?: number
  rawTop?: number
  rawLeft?: number
  wrapperWidth: number
  wrapperHeight: number
  setMenu: (menu: any | null) => void
  [key: string]: any
}

export default function EdgeContextMenu({
  edge,
  edges,
  top,
  left,
  right,
  bottom,
  wrapperWidth,
  wrapperHeight,
  setMenu,
  ...props
}: EdgeContextMenuProps) {
  const { id: sketchId } = useParams({ strict: false })
  const removeEdges = useGraphStore((s) => s.removeEdges)
  const clearSelectedEdges = useGraphStore((s) => s.clearSelectedEdges)
  const { confirm } = useConfirm()

  // Determine if multi-select or single
  const isMultiSelect = edges && edges.length > 0
  const edgesToDelete = isMultiSelect ? edges : edge ? [edge] : []
  const edgeIds = edgesToDelete.map((e) => e.id)

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (edgeIds.length === 0 || !sketchId) return

    // Confirm deletion
    const count = edgeIds.length
    if (
      !(await confirm({
        title: `You are about to delete ${count} relationship${count > 1 ? 's' : ''}?`,
        message: 'The action is irreversible.'
      }))
    ) {
      return
    }

    // Close menu
    setMenu(null)

    // Optimistic delete + API call with toast
    toast.promise(
      (async () => {
        // Optimistic update
        removeEdges(edgeIds)
        if (isMultiSelect) clearSelectedEdges()
        // API call
        return sketchService.deleteEdges(
          sketchId,
          JSON.stringify({ relationshipIds: edgeIds })
        )
      })(),
      {
        loading: `Deleting ${count} relationship${count > 1 ? 's' : ''}...`,
        success: `Relationship${count > 1 ? 's' : ''} deleted successfully.`,
        error: 'Failed to delete relationship.'
      }
    )
  }, [edgeIds, sketchId, setMenu, removeEdges, clearSelectedEdges, isMultiSelect, confirm])

  return (
    <BaseContextMenu
      top={top}
      left={left}
      right={right}
      bottom={bottom}
      wrapperWidth={wrapperWidth}
      wrapperHeight={wrapperHeight}
      setMenu={setMenu}
      {...props}
    >
      {/* Header with label */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex text-xs items-center gap-1 truncate">
          {isMultiSelect ? (
            <span className="block truncate">{edgeIds.length} relationships selected</span>
          ) : (
            <span className="block truncate">{edge?.label || 'Relationship'}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-1 flex gap-1">
        {!isMultiSelect && edge && (
          <CopyButton size="icon" content={edge.label} className="h-7 w-7" />
        )}
        <Button
          onClick={handleDelete}
          size="icon"
          variant="ghost"
          className="h-7 w-7"
        >
          <Trash2 className="!h-3.5 !w-3.5 opacity-50" />
        </Button>
      </div>
    </BaseContextMenu>
  )
}
