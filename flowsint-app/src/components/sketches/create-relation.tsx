import { useState } from 'react'
import { useGraphStore } from '@/stores/graph-store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ArrowRight, ArrowLeftRight, GitPullRequestArrow } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { sketchService } from '@/api/sketch-service'
import { useParams } from '@tanstack/react-router'
import { useIcon } from '@/hooks/use-icon'
import { RadioGroupItem } from '@/components/ui/radio-group'
import { type GraphNode } from '@/types'

export function CreateRelationDialog() {
  const { id: sketchId } = useParams({ strict: false })
  const selectedNodes = useGraphStore((state) => state.selectedNodes || [])
  const addEdge = useGraphStore((state) => state.addEdge)
  const openAddRelationDialog = useGraphStore((state) => state.openAddRelationDialog)
  const setOpenAddRelationDialog = useGraphStore((state) => state.setOpenAddRelationDialog)
  const [relationType, setRelationType] = useState('IS_RELATED_TO')
  const [isReversed, setIsReversed] = useState(false)

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()

    // Determine source/target based on switch state. If multiple nodes are selected,
    // relate all left-side nodes to the single right-side node.
    const sourceIndex = isReversed ? selectedNodes.length - 1 : 0
    const targetIndex = isReversed ? 0 : selectedNodes.length - 1

    const newEdge = {
      source: selectedNodes[sourceIndex],
      target: selectedNodes[targetIndex],
      label: relationType,
      sketch_id: sketchId
    }
    const newEdgeObject = {
      label: relationType,
      type: 'one-way',
      source: newEdge.source.id,
      target: newEdge.target.id
    } as any

    toast.promise(
      (async () => {
        if (addEdge) addEdge(newEdgeObject)
        setOpenAddRelationDialog(false)
        return sketchService.addEdge(sketchId as string, JSON.stringify(newEdgeObject))
      })(),
      {
        loading: 'Creating relation...',
        success: 'Relation successfully added.',
        error: 'Unexpected error during relation creation.'
      }
    )
  }

  return (
    <Dialog open={openAddRelationDialog} onOpenChange={setOpenAddRelationDialog}>
      <DialogContent className="w-full! max-w-[600px]!">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequestArrow className="h-4 w-4" />
            New relationship
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
          {/* Selected Nodes Display */}
          <div className="space-y-2 w-full">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Selected Nodes ({selectedNodes.length})
            </Label>
            <div className="flex w-full overflow-x-auto gap-2 min-w-0">
              {selectedNodes.map((node) => (
                <NodeDisplayCard key={node.id} node={node} />
              ))}
            </div>
          </div>

          {/* Relationship Type */}
          <div className="space-y-2">
            <Label
              htmlFor="relation-type"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Relationship Type
            </Label>
            <Input
              id="relation-type"
              placeholder="e.g., IS_RELATED_TO, WORKS_FOR, OWNS"
              value={relationType}
              onChange={(e) => setRelationType(e.target.value)}
              className="w-full h-9 text-sm"
              required
            />
          </div>

          {/* Visual Preview (one-way with switch) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Preview
            </Label>
            {/* Switch control outside of the preview box */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shadow-sm"
                onClick={() => setIsReversed((v) => !v)}
                aria-label="Switch direction"
                title="Switch direction"
              >
                <ArrowLeftRight className="h-4 w-4 mr-1" />
                <span>Switch direction</span>
              </Button>
            </div>
            <div className="p-3 border rounded-md bg-muted/20">
              <div className="flex items-center justify-between">
                {/* Left side nodes */}
                <div className="flex items-center gap-2">
                  {(isReversed ? selectedNodes.slice(1) : selectedNodes.slice(0, -1)).map(
                    (node) => (
                      <NodeDisplayCard key={node.id} node={node} variant="preview" />
                    )
                  )}
                </div>
                <div className="flex items-center truncate justify-center px-2 shrink-0 min-w-0 grow">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="h-px bg-muted-foreground/30 flex-1"></div>
                    <span className="px-2 py-1 bg-muted/50 rounded-sm truncate">
                      {relationType || 'IS_RELATED'}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                </div>
                {/* Right side node */}
                <div className="flex items-center gap-2">
                  {(isReversed ? selectedNodes.slice(0, 1) : selectedNodes.slice(-1)).map(
                    (node) => (
                      <NodeDisplayCard key={node.id} node={node} variant="preview" />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpenAddRelationDialog(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!relationType.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface NodeDisplayCardProps {
  node: GraphNode
  variant?: 'default' | 'preview'
  asRadio?: boolean
  radioValue?: string
  id?: string
}

export function NodeDisplayCard({
  node,
  variant = 'default',
  asRadio = false,
  radioValue,
  id
}: NodeDisplayCardProps) {
  const NodeIcon = useIcon(node.nodeType, {
    nodeColor: node.nodeColor,
    nodeIcon: node.nodeIcon,
    nodeImage: node.nodeImage
  })
  if (variant === 'preview') {
    return (
      <div className="flex min-w-[170px] items-center gap-2 min-w-0">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
          <NodeIcon size={20} />
        </div>
        <span className="text-xs text-muted-foreground max-w-[200px] truncate">
          {node.nodeLabel}
        </span>
      </div>
    )
  }

  if (asRadio) {
    return (
      <label
        htmlFor={id}
        className="flex min-w-[170px] items-center gap-2 px-3 py-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 min-w-0"
      >
        <RadioGroupItem id={id} value={radioValue || ''} className="mt-0.5" />
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted">
            <NodeIcon size={16} />
          </div>
          <span className="text-sm max-w-[200px] truncate">{node.nodeLabel}</span>
        </div>
      </label>
    )
  }

  return (
    <div className="flex min-w-[170px] items-center gap-2 px-3 py-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors min-w-0">
      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted">
        <NodeIcon size={16} />
      </div>
      <span className="text-sm max-w-[200px] truncate">{node.nodeLabel}</span>
    </div>
  )
}
