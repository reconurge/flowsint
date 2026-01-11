import { memo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CopyButton } from '@/components/copy'
import { Check, Rocket, X, MousePointer, Link2 } from 'lucide-react'
import LaunchFlow from '../launch-enricher'
import NodeActions from '../graph/actions/node-actions'
import { Button } from '../../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip'
import { useParams } from '@tanstack/react-router'
import NeighborsGraph from './neighbors'
import Relationships from './relationships'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../../ui/resizable'
import { GraphNode } from '@/types'
import { useGraphStore } from '@/stores/graph-store'
import { Badge } from '@/components/ui/badge'
import DOMPurify from 'dompurify'
import { useIcon } from '@/hooks/use-icon'

const DetailsPanel = memo(({ node }: { node: GraphNode | null }) => {
  const { id: sketchId } = useParams({ strict: false })
  const nodes = useGraphStore((s) => s.nodes)
  const NodeIcon = useIcon(node?.data?.type || 'default')
  const setCurrentNode = useGraphStore((s) => s.setCurrentNode)
  node = nodes.find((n) => n.id === node?.id) || null

  const handleClose = useCallback(() => {
    setCurrentNode(null)
  }, [])
  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <MousePointer className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Node Selected</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Click on any node in the graph to view its details and properties
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      <div className="flex items-center sticky w-full top-0 border-b justify-start pr-4 pl-2 py-2 h-10 gap-2 bg-card/90 backdrop-blur-md ">
        <Button
          onClick={handleClose}
          size={'icon'}
          variant={'ghost'}
          className="h-7 w-7 hover:bg-accent rounded-full"
        >
          <X />
        </Button>
        <div className="grow" />
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <LaunchFlow values={[node.id]} type={node.data?.type}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted opacity-70 hover:opacity-100"
                    >
                      <Rocket className="h-3 w-3" strokeWidth={2} />
                    </Button>
                  </LaunchFlow>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Launch enricher</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <NodeActions node={node} />
        </div>
      </div>
      <div className="px-4 pt-4 pb-4 border-b">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="shrink-0">
            <NodeIcon size={38} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold truncate">{node.data?.label}</h2>
              <CopyButton className="h-4 w-4" content={node.data.label} />
            </div>
            {node.data?.type && (
              <Badge variant="secondary" className="text-xs">
                {node.data.type}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="vertical" className="h-full">
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="h-full overflow-auto">
              {node.data?.description && (
                <div className="px-4 py-3 border-b border-border">
                  <div
                    className="text-sm text-muted-foreground prose dark:prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(node.data.description) }}
                  />
                </div>
              )}
              <MemoizedKeyValueDisplay data={node.data} />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="h-full w-full p-3">
              <NeighborsGraph
                nodeLength={nodes.length}
                sketchId={sketchId as string}
                nodeId={node.id}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={30} minSize={20}>
            <Relationships
              nodeLength={nodes.length}
              sketchId={sketchId as string}
              nodeId={node.id}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
})

export default DetailsPanel

interface KeyValueDisplayProps {
  data: Record<string, any>
  className?: string
}

function KeyValueDisplay({ data, className }: KeyValueDisplayProps) {
  return (
    <div className={cn('w-full border-collapse', className)}>
      {data &&
        Object.entries(data)
          .filter(
            ([key]) =>
              !['id', 'sketch_id', 'caption', 'size', 'color', 'description', 'x', 'y'].includes(
                key
              )
          )
          .map(([key, value], index) => {
            let val: string | null = null
            let display: React.ReactNode = null
            if (typeof value === 'number') {
              val = value.toString()
              display = <StatusCodeBadge statusCode={value} />
            } else if (typeof value === 'boolean') {
              val = value.toString()
              display = value ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-600" />
              )
            } else if (typeof value === 'object') {
              val = value?.['label'] ?? 'N/A'
              display = val
            } else if (Array.isArray(value)) {
              val = `${value.length} items`
              display = val
            } else {
              val = value?.toString() || null
              display =
                typeof val === 'string' && val.startsWith('https://') ? (
                  <a
                    href={val}
                    className="underline text-primary truncate"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {val}
                  </a>
                ) : (
                  val
                )
            }

            return (
              <div
                key={index}
                className="flex w-full bg-card items-center divide-x divide-border border-b border-border p-0"
              >
                <div className="w-1/2 px-4 p-2 text-sm text-muted-foreground font-normal truncate">
                  {key}
                </div>
                <div className="w-1/2 px-4 p-2 text-sm font-medium flex items-center justify-between min-w-0">
                  <div className="truncate font-semibold">
                    {display || <span className="italic text-muted-foreground">N/A</span>}
                  </div>
                  {display && val && typeof value !== 'boolean' && (
                    <CopyButton className="h-6 w-6 shrink-0" content={val} />
                  )}
                </div>
              </div>
            )
          })}
    </div>
  )
}

export const MemoizedKeyValueDisplay = memo(KeyValueDisplay)

interface StatusCodeBadgeProps {
  statusCode: number
}
export function StatusCodeBadge({ statusCode }: StatusCodeBadgeProps) {
  const category = Math.floor(statusCode / 100)

  const variants = {
    1: 'bg-blue-100 text-blue-800 border-blue-300',
    2: 'bg-green-100 text-green-800 border-green-300',
    3: 'bg-purple-100 text-purple-800 border-purple-300',
    4: 'bg-orange-100 text-orange-800 border-orange-300',
    5: 'bg-red-100 text-red-800 border-red-300'
  }

  const labels = {
    1: 'Informational',
    2: 'Success',
    3: 'Redirect',
    4: 'Client Error',
    5: 'Server Error'
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs',
        variants[category as keyof typeof variants] || 'bg-gray-100 text-gray-800'
      )}
    >
      {statusCode}
      {/* {labels[category as keyof typeof labels]} */}
    </Badge>
  )
}
