import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, ArrowRight, MousePointer, Link2 } from 'lucide-react'
import { useGraphStore } from '@/stores/graph-store'
import { useParams } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useIcon } from '@/hooks/use-icon'
import { useConfirm } from '@/components/use-confirm-dialog'
import { sketchService } from '@/api/sketch-service'
import { CopyButton } from '@/components/copy'
import { GraphEdge } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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
    <div className="flex flex-col h-full overflow-x-hidden overflow-y-auto bg-card">
      {/* Header */}
      <div className="flex items-center bg-card h-10 sticky w-full top-0 border-b justify-start px-3 gap-2 z-1">
        <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <p className="text-sm font-semibold truncate">{edge.label || 'Relationship'}</p>
        <div className="grow" />
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-6 w-6 p-0 hover:bg-muted opacity-70 hover:opacity-100 text-destructive hover:text-destructive"
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-x-hidden">
        {/* Connection Flow */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {/* Source Node */}
            <button
              onClick={handleJumpToSource}
              className="flex-1 flex items-center gap-2 p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group min-w-0"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background flex-shrink-0">
                <SourceIcon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] text-muted-foreground mb-0.5">Source</p>
                <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                  {sourceNode?.data?.label || 'Unknown'}
                </p>
              </div>
            </button>

            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

            {/* Target Node */}
            <button
              onClick={handleJumpToTarget}
              className="flex-1 flex items-center gap-2 p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group min-w-0"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background flex-shrink-0">
                <TargetIcon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] text-muted-foreground mb-0.5">Target</p>
                <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                  {targetNode?.data?.label || 'Unknown'}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Properties */}
        <div className="w-full overflow-x-hidden">
          {/* Label */}
          <div className="flex w-full bg-card items-center divide-x divide-border border-b border-border p-0">
            <div className="w-1/2 px-3 py-1.5 text-xs text-muted-foreground font-normal truncate">
              Label
            </div>
            <div className="w-1/2 px-3 py-1.5 text-xs font-medium flex items-center justify-between min-w-0 gap-1">
              <div className="truncate font-semibold">
                {edge.label || <span className="italic text-muted-foreground">N/A</span>}
              </div>
              {edge.label && <CopyButton className="h-5 w-5 shrink-0" content={edge.label} />}
            </div>
          </div>

          {/* Type */}
          {edge.type && (
            <div className="flex w-full bg-card items-center divide-x divide-border border-b border-border p-0">
              <div className="w-1/2 px-3 py-1.5 text-xs text-muted-foreground font-normal truncate">
                Type
              </div>
              <div className="w-1/2 px-3 py-1.5 text-xs font-medium flex items-center justify-between min-w-0">
                <Badge variant="secondary" className="truncate text-[10px] px-1.5 py-0">
                  {edge.type}
                </Badge>
              </div>
            </div>
          )}

          {/* Caption */}
          {edge.caption && (
            <div className="flex w-full bg-card items-center divide-x divide-border border-b border-border p-0">
              <div className="w-1/2 px-3 py-1.5 text-xs text-muted-foreground font-normal truncate">
                Caption
              </div>
              <div className="w-1/2 px-3 py-1.5 text-xs font-medium flex items-center justify-between min-w-0 gap-1">
                <div className="truncate font-semibold">{edge.caption}</div>
                <CopyButton className="h-5 w-5 shrink-0" content={edge.caption} />
              </div>
            </div>
          )}

          {/* Date */}
          {edge.date && (
            <div className="flex w-full bg-card items-center divide-x divide-border border-b border-border p-0">
              <div className="w-1/2 px-3 py-1.5 text-xs text-muted-foreground font-normal truncate">
                Date
              </div>
              <div className="w-1/2 px-3 py-1.5 text-xs font-medium flex items-center justify-between min-w-0 gap-1">
                <div className="truncate font-semibold">{edge.date}</div>
                <CopyButton className="h-5 w-5 shrink-0" content={edge.date} />
              </div>
            </div>
          )}

          {/* Confidence Level */}
          {edge.confidence_level !== undefined && edge.confidence_level !== null && (
            <div className="flex w-full bg-card items-center divide-x divide-border border-b border-border p-0">
              <div className="w-1/2 px-3 py-1.5 text-xs text-muted-foreground font-normal truncate">
                Confidence
              </div>
              <div className="w-1/2 px-3 py-1.5 text-xs font-medium flex items-center justify-between min-w-0 gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="h-1.5 flex-1 min-w-[40px] max-w-[60px] bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        Number(edge.confidence_level) >= 70
                          ? 'bg-green-500'
                          : Number(edge.confidence_level) >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      )}
                      style={{ width: `${Number(edge.confidence_level)}%` }}
                    />
                  </div>
                  <span className="font-semibold text-[10px] shrink-0">{edge.confidence_level}%</span>
                </div>
              </div>
            </div>
          )}

          {/* ID */}
          <div className="flex w-full bg-card items-center divide-x divide-border border-b border-border p-0">
            <div className="w-1/2 px-3 py-1.5 text-xs text-muted-foreground font-normal truncate">
              ID
            </div>
            <div className="w-1/2 px-3 py-1.5 text-xs font-medium flex items-center justify-between min-w-0 gap-1">
              <code className="truncate text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                {edge.id}
              </code>
              <CopyButton className="h-5 w-5 shrink-0" content={edge.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

EdgeDetailsPanel.displayName = 'EdgeDetailsPanel'

export default EdgeDetailsPanel
