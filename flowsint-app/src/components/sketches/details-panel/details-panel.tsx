'use client'

import type React from 'react'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover'
import { memo, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CopyButton } from '@/components/copy'
import { X, Loader2, Rocket, Link2, MousePointer, ArrowDownLeft } from 'lucide-react'
import LaunchFlow from '../launch-enricher'
import NodeActions from '../graph/node/actions/node-actions'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip'
import { useParams } from '@tanstack/react-router'
import { useGraphStore } from '@/stores/graph-store'
import DOMPurify from 'dompurify'
import { useIcon } from '@/hooks/use-icon'
import { Switch } from '@/components/ui/switch'
import type { GraphNode, NodeProperties, NodeMetadata, NodeShape } from '@/types'
import { sketchService } from '@/api/sketch-service'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import IconPicker from '@/components/shared/icon-picker'
import { ResizableDetailsPanel, Row } from './resizable-details-panels'
import Relationships from './relationships'
import NeighborsGraph from './neighbors'
import { Circle, Square, Triangle, Hexagon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Slider } from '@/components/ui/slider'

// Types
type FormData = {
  nodeLabel: string
  nodeColor: string | null
  nodeIcon: string | null
  nodeImage: string | null
  nodeFlag: string | null
  nodeShape: string | null
  nodeSize: number | null
  nodeProperties: NodeProperties
  nodeMetadata: NodeMetadata
  notes: string
}

// Constants
const COLORS = [
  { name: 'default', value: null },
  { name: 'red', value: '#ef4444' },
  { name: 'orange', value: '#f97316' },
  { name: 'yellow', value: '#eab308' },
  { name: 'green', value: '#22c55e' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'purple', value: '#a855f7' },
  { name: 'pink', value: '#ec4899' }
]

const NODE_SHAPES = {
  circle: Circle,
  square: Square,
  hexagon: Hexagon,
  triangle: Triangle
} satisfies Record<NodeShape, React.ComponentType<{ size?: number; className?: string }>>
// Extended Row Component with copy support
const RowWithCopy = memo(
  ({
    label,
    copyValue,
    children
  }: {
    label: string
    copyValue?: string
    children: React.ReactNode
  }) => (
    <div className="flex items-center justify-between py-1.5 group hover:bg-muted/20 -mx-2 px-2 rounded-sm transition-colors">
      <span className="text-[13px] text-muted-foreground">{label.replace(/_/g, ' ')}</span>
      <div className="text-[13px] text-foreground flex items-center gap-1">
        {copyValue && (
          <CopyButton
            content={copyValue}
            className="h-4 w-4 opacity-0 group-hover:opacity-60 transition-opacity"
          />
        )}
        {children}
      </div>
    </div>
  )
)
RowWithCopy.displayName = 'RowWithCopy'

// Status Code Badge
const StatusCodeBadge = memo(({ statusCode }: { statusCode: number }) => {
  const category = Math.floor(statusCode / 100)
  const colors: Record<number, string> = {
    1: 'text-blue-600',
    2: 'text-green-600',
    3: 'text-purple-600',
    4: 'text-orange-600',
    5: 'text-red-600'
  }
  return <span className={cn('font-medium', colors[category])}>{statusCode}</span>
})

// Helpers
const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const formatDate = (value: any): string => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return String(value)
  }
}

// Main Component
const DetailsPanel = memo(() => {
  const { id: sketchId } = useParams({ strict: false })
  const nodesLength = useGraphStore((s) => s.nodesLength)
  const node = useGraphStore((s) => s.getCurrentNode())
  const setCurrentNodeId = useGraphStore((s) => s.setCurrentNodeId)
  const updateNode = useGraphStore((s) => s.updateNode)
  console.log(node)
  const [openIconPicker, setOpenIconPicker] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    nodeLabel: '',
    nodeColor: null,
    nodeIcon: null,
    nodeImage: null,
    nodeFlag: null,
    nodeShape: null,
    nodeSize: 0,
    nodeProperties: {},
    nodeMetadata: {},
    notes: ''
  })
  const [nodeSize, setNodeSize] = useState<number>(0)

  const IconComponent = useIcon(node?.nodeType as string, {
    nodeColor: node?.nodeColor,
    nodeIcon: node?.nodeIcon,
    nodeImage: node?.nodeImage
  })

  useEffect(() => {
    nodeSize !== node?.nodeSize && setHasChanges(true)
  }, [nodeSize])

  // Sync form data when node changes
  useEffect(() => {
    if (node) {
      const {
        nodeLabel,
        nodeImage,
        nodeIcon,
        nodeFlag,
        nodeColor,
        nodeShape,
        nodeMetadata,
        nodeProperties,
        nodeSize
      } = node
      setFormData({
        nodeLabel: nodeLabel || '',
        nodeProperties: nodeProperties || {},
        nodeMetadata: nodeMetadata || {},
        nodeColor,
        nodeIcon,
        nodeImage,
        nodeFlag,
        nodeShape,
        nodeSize,
        notes: (nodeMetadata?.notes as string) || ''
      })
      setNodeSize(node.nodeSize ?? 0)
      setHasChanges(false)
    }
  }, [node])

  const queryClient = useQueryClient()

  // Mutation
  const updateNodeMutation = useMutation({
    mutationFn: async ({
      sketchId,
      body
    }: {
      sketchId: string
      body: { nodeId: string; updates: Partial<GraphNode> }
    }) => {
      return sketchService.updateNode(sketchId, JSON.stringify(body))
    },
    onSuccess: (result) => {
      if (result.status === 'node updated' && node) {
        const { notes, ...rest } = formData
        const updates = { ...rest, nodeMetadata: { ...rest.nodeMetadata, notes }, nodeSize }
        updateNode(node.id, updates as Partial<GraphNode>)
        if (sketchId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.sketches.detail(sketchId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.sketches.graph(sketchId, sketchId) })
        }
        toast.success('Saved')
        setHasChanges(false)
      } else {
        toast.error('Failed to update')
      }
    },
    onError: (error) => {
      console.log(error)
      toast.error('Failed to save')
    }
  })

  const handleSave = useCallback(async () => {
    if (!node || !sketchId) return
    setIsSaving(true)
    try {
      const { notes, ...rest } = formData
      const updateData = {
        nodeId: node.id,
        updates: {
          ...rest,
          nodeType: node.nodeType,
          nodeMetadata: { ...rest.nodeMetadata, notes }
        } as Partial<GraphNode>
      }
      await updateNodeMutation.mutateAsync({ sketchId, body: updateData })
    } catch (error) {
      console.error('Error updating node:', error)
    } finally {
      setIsSaving(false)
    }
  }, [node, sketchId, formData, updateNodeMutation])

  const handleClose = useCallback(() => {
    setCurrentNodeId(null)
  }, [setCurrentNodeId])

  const handleChange = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }, [])

  const handlePropertyChange = useCallback((key: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      nodeProperties: { ...prev.nodeProperties, [key]: value }
    }))
    setHasChanges(true)
  }, [])

  const handleIconSelect = useCallback(
    (_iconType: string, iconName: string | null) => {
      handleChange('nodeIcon', iconName)
    },
    [handleChange]
  )

  // Empty state
  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <MousePointer className="h-5 w-5 text-muted-foreground/40 mb-3" />
        <p className="text-[13px] text-muted-foreground/60">Select a node</p>
      </div>
    )
  }

  const propertiesFields = Object.entries(formData.nodeProperties)
  const metadataFields = Object.entries(formData.nodeMetadata).filter(([key]) => key !== 'notes')
  const description = node.nodeProperties?.description as string | undefined

  return (
    <div className="flex flex-col h-full bg-card border-border">
      {/* Header - Minimal */}
      <div className="h-10 border-b flex w-full bg-red-5 items-center justify-between">
        <div className="px-4 flex items-start w-full justify-between gap-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <button
              onClick={() => setOpenIconPicker(true)}
              className="shrink-0 hover:opacity-70 transition-opacity"
            >
              <IconComponent size={18} />
            </button>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={formData.nodeLabel}
                onChange={(e) => handleChange('nodeLabel', e.target.value)}
                className="w-full text-md font-medium bg-transparent outline-none placeholder:text-muted-foreground/40 focus:bg-muted/20 -ml-1 px-1 rounded transition-colors"
                placeholder="Untitled"
              />
              {/*<span className="text-[11px] text-muted-foreground/60 ml-0.5">{node.nodeType}</span>*/}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <LaunchFlow values={[node.id]} type={node.nodeType}>
                      <button className="p-1.5 rounded opacity-70 transition-colors">
                        <Rocket className="h-4 w-4 opacity-70" strokeWidth={1.7} />
                      </button>
                    </LaunchFlow>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Enrich</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <NodeActions node={node} />
            <button
              onClick={handleClose}
              className="p-1.5 text-muted-foreground/50 hover:text-muted-foreground rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="py-2 px-4 border-b border-border/50 shrink-0">
          <div
            className="text-[13px] text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
          />
        </div>
      )}

      {/* Content - Resizable Panels */}
      <ResizableDetailsPanel
        className="flex-1 min-h-0"
        sections={[
          {
            id: 'properties',
            label: 'Properties',
            defaultOpen: true,
            defaultSize: 25,
            minSize: 10,
            content: (
              <div className="p-3">
                {propertiesFields.length > 0 ? (
                  propertiesFields.map(([key, value]) => (
                    <RowWithCopy
                      key={key}
                      label={key}
                      copyValue={typeof value === 'string' ? value : undefined}
                    >
                      {typeof value === 'boolean' ? (
                        <Switch
                          checked={value}
                          onCheckedChange={(checked) => handlePropertyChange(key, checked)}
                          className="scale-75"
                        />
                      ) : typeof value === 'number' ? (
                        <StatusCodeBadge statusCode={value} />
                      ) : typeof value === 'string' && value.startsWith('https://') ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[12px] transition-colors"
                        >
                          <Link2 className="h-3 w-3" />
                          <span className="truncate max-w-[100px]">{new URL(value).hostname}</span>
                        </a>
                      ) : value && value.constructor === Object ? (
                        <PopoverProperty label={key} property={value} />
                      ) : (
                        <input
                          type="text"
                          value={String(value || '')}
                          onChange={(e) => handlePropertyChange(key, e.target.value)}
                          className="w-28 text-right text-[12px] bg-transparent outline-none placeholder:text-muted-foreground/30 focus:bg-muted/20 px-1 rounded transition-colors truncate"
                          placeholder="Empty"
                        />
                      )}
                    </RowWithCopy>
                  ))
                ) : (
                  <p className="text-[12px] text-muted-foreground/40 py-1">No properties</p>
                )}
              </div>
            )
          },
          {
            id: 'neighbors',
            label: 'Neighbors',
            defaultOpen: true,
            defaultSize: 40,
            minSize: 25,
            content: (
              <div className="h-full overflow-hidden">
                <NeighborsGraph
                  sketchId={sketchId as string}
                  currentNode={node}
                  nodeLength={nodesLength}
                />
              </div>
            )
          },
          {
            id: 'relations',
            label: 'Relations',
            defaultOpen: true,
            defaultSize: 20,
            minSize: 15,
            content: (
              <div className="h-full p-3">
                <Relationships
                  sketchId={sketchId as string}
                  nodeId={node.id}
                  nodeLength={nodesLength}
                />
              </div>
            )
          },
          {
            id: 'appearance',
            label: 'Appearance',
            defaultOpen: false,
            fixedSize: 12,
            minSize: 10,
            content: (
              <div className="p-3">
                <Row label={`Size (${nodeSize})`}>
                  <div className="flex w-full items-center">
                    <Slider
                      value={[nodeSize]}
                      onValueChange={([value]) => setNodeSize(value)}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1 grow"
                    />
                  </div>
                </Row>
                <Row label="Color">
                  <div className="flex items-center gap-1">
                    {COLORS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => handleChange('nodeColor', color.value)}
                        className={cn(
                          'w-3 h-3 rounded-full transition-all',
                          color.value ? '' : 'bg-muted-foreground/20',
                          formData.nodeColor === color.value &&
                            'ring-1 ring-offset-1 ring-offset-background ring-foreground/30'
                        )}
                        style={color.value ? { backgroundColor: color.value } : undefined}
                      />
                    ))}
                  </div>
                </Row>
                <Row label="Icon">
                  <button
                    onClick={() => setOpenIconPicker(true)}
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {formData.nodeIcon || 'Default'}
                  </button>
                </Row>
                <Row label="Shape">
                  <div className="flex items-center gap-1">
                    <ToggleGroup
                      onValueChange={(value) => handleChange('nodeShape', value || null)}
                      type="single"
                      size="sm"
                      defaultValue={node.nodeShape || 'circle'}
                      variant="outline"
                      className="shadow-none!"
                    >
                      {(
                        Object.entries(NODE_SHAPES) as [
                          NodeShape,
                          (typeof NODE_SHAPES)[NodeShape]
                        ][]
                      ).map(([shape, Icon]) => (
                        <ToggleGroupItem value={shape} aria-label={shape}>
                          <Icon size={14} />
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </Row>
                <Row label="Image">
                  <input
                    type="text"
                    value={formData.nodeImage || ''}
                    onChange={(e) => handleChange('nodeImage', e.target.value || null)}
                    className="w-24 text-right text-[12px] bg-transparent outline-none placeholder:text-muted-foreground/30 focus:bg-muted/20 px-1 rounded transition-colors"
                    placeholder="URL..."
                  />
                </Row>
              </div>
            )
          },
          {
            id: 'metadata',
            label: 'Metadata',
            defaultOpen: false,
            defaultSize: 20,
            minSize: 10,
            content: (
              <div className="p-3">
                {metadataFields.length > 0 ? (
                  metadataFields.map(([key, value]) => (
                    <RowWithCopy
                      key={key}
                      label={key}
                      copyValue={typeof value === 'string' ? value : undefined}
                    >
                      {key.includes('_at') || key.includes('date')
                        ? formatDate(value)
                        : formatValue(value)}
                    </RowWithCopy>
                  ))
                ) : (
                  <p className="text-[12px] text-muted-foreground/40 py-1">No metadata</p>
                )}
              </div>
            )
          }
          // {
          //   id: 'notes',
          //   label: 'Notes',
          //   defaultOpen: false,
          //   defaultSize: 15,
          //   minSize: 10,
          //   content: (
          //     <textarea
          //       value={formData.notes}
          //       onChange={(e) => handleChange('notes', e.target.value)}
          //       placeholder="Add notes..."
          //       className="w-full h-full text-[13px] bg-transparent outline-none resize-none placeholder:text-muted-foreground/30 leading-relaxed"
          //     />
          //   )
          // },
        ]}
      />

      {/* Footer - Save bar */}
      {hasChanges && (
        <div className="px-4 py-2.5 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/60">Unsaved changes</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (node) {
                    const {
                      nodeLabel,
                      nodeImage,
                      nodeIcon,
                      nodeFlag,
                      nodeColor,
                      nodeMetadata,
                      nodeShape,
                      nodeSize,
                      nodeProperties
                    } = node
                    setFormData({
                      nodeLabel: nodeLabel || '',
                      nodeProperties: nodeProperties || {},
                      nodeMetadata: nodeMetadata || {},
                      nodeColor,
                      nodeIcon,
                      nodeImage,
                      nodeFlag,
                      nodeShape,
                      nodeSize,
                      notes: (nodeMetadata?.notes as string) || ''
                    })
                    setHasChanges(false)
                  }
                }}
                className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="text-[11px] bg-foreground text-background px-2.5 py-1 rounded hover:opacity-80 transition-opacity flex items-center gap-1"
              >
                {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                {isSaving ? 'Saving' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <IconPicker
        // @ts-ignore
        onIconChange={handleIconSelect}
        open={openIconPicker}
        setOpen={setOpenIconPicker}
        iconType={null}
      />
    </div>
  )
})

export default DetailsPanel
export { StatusCodeBadge }

export const PopoverProperty = ({ label, property }: { label: string; property: object }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="h-6 flex items-end text-xs cursor-pointer">
          <ArrowDownLeft className="h-3 w-3 opacity-60" />{' '}
          <span className="underline">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="mr-4">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
          {Object.entries(property).map(([key, value]) => (
            <div>
              {key} : {JSON.stringify(value)}
            </div>
          ))}
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}
