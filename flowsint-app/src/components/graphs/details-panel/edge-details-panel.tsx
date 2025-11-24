import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, ArrowRight, MousePointer } from 'lucide-react'
import { useGraphStore } from '@/stores/graph-store'
import { useParams } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useIcon } from '@/hooks/use-icon'
import { useConfirm } from '@/components/use-confirm-dialog'
import { sketchService } from '@/api/sketch-service'
import { CopyButton } from '@/components/copy'
import { GraphEdge } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const EdgeDetailsPanel = memo(({ edge }: { edge: GraphEdge | null }) => {
  const { id: sketchId } = useParams({ strict: false })
  const edges = useGraphStore((s) => s.edges)
  const nodes = useGraphStore((s) => s.nodes)
  const setCurrentNode = useGraphStore((s) => s.setCurrentNode)
  const setCurrentEdge = useGraphStore((s) => s.setCurrentEdge)
  const removeEdges = useGraphStore((s) => s.removeEdges)
  const { confirm } = useConfirm()

  // Get fresh edge data from store
  edge = edges.find((e) => e.id === edge?.id) || null

  // Find source and target nodes
  const sourceNode = edge ? nodes.find((n) => n.id === edge.source) : null
  const targetNode = edge ? nodes.find((n) => n.id === edge.target) : null

  const SourceIcon = useIcon(sourceNode?.data?.type ?? "default", sourceNode?.data?.src)
  const TargetIcon = useIcon(targetNode?.data?.type ?? "default", targetNode?.data?.src)

  const handleDelete = useCallback(async () => {
    if (!edge || !sketchId) return

    if (
      !(await confirm({
        title: 'You are about to delete this relationship?',
        message: 'The action is irreversible.'
      }))
    ) {
      return
    }

    // Close panel
    setCurrentEdge(null)

    // Optimistic delete + API call with toast
    toast.promise(
      (async () => {
        removeEdges([edge.id])
        return sketchService.deleteEdges(
          sketchId as string,
          JSON.stringify({ relationshipIds: [edge.id] })
        )
      })(),
      {
        loading: 'Deleting relationship...',
        success: 'Relationship deleted successfully.',
        error: 'Failed to delete relationship.'
      }
    )
  }, [edge, sketchId, confirm, removeEdges, setCurrentEdge])

  const handleJumpToSource = useCallback(() => {
    if (sourceNode) {
      setCurrentNode(sourceNode)
    }
  }, [sourceNode, setCurrentNode])

  const handleJumpToTarget = useCallback(() => {
    if (targetNode) {
      setCurrentNode(targetNode)
    }
  }, [targetNode, setCurrentNode])

  if (!edge) {
    return (
      <div className="flex p-12 rounded-xl border flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <MousePointer className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Relationship Selected</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Click on any relationship in the graph to view its details
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center h-10 bg-card border-b px-3 gap-2">
      {/* Source */}
      {sourceNode && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleJumpToSource}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex-shrink-0"
              >
                <SourceIcon className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{sourceNode.data.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Arrow */}
      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

      {/* Label */}
      <div className="flex-1 min-w-0 flex items-center gap-1">
        <span className="text-xs font-medium truncate">{edge.label || 'Relationship'}</span>
        {edge.label && <CopyButton content={edge.label} size="icon" className="h-5 w-5 flex-shrink-0" />}
      </div>

      {/* Arrow */}
      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

      {/* Target */}
      {targetNode && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleJumpToTarget}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex-shrink-0"
              >
                <TargetIcon className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{targetNode.data.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Delete */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-6 w-6 p-0 hover:bg-muted opacity-70 hover:opacity-100 text-destructive hover:text-destructive flex-shrink-0"
            >
              <Trash2 className="h-3 w-3" strokeWidth={2} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete relationship</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
})

EdgeDetailsPanel.displayName = 'EdgeDetailsPanel'

export default EdgeDetailsPanel
