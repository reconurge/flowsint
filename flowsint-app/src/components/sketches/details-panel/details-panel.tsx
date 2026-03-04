'use client'

import type React from 'react'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover'
import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CopyButton } from '@/components/copy'
import {
  Rocket,
  Link2,
  MousePointer,
  ArrowDownLeft,
  ChevronDown,
  ChevronRight as ChevronRightIcon
} from 'lucide-react'
import LaunchFlow from '../launch-enricher'
import NodeActions from '../graph/node/actions/node-actions'
import { useParams } from '@tanstack/react-router'
import { useGraphStore } from '@/stores/graph-store'
import { useIcon } from '@/hooks/use-icon'
import { Switch } from '@/components/ui/switch'
import type { GraphNode, NodeProperties, NodeMetadata, NodeShape } from '@/types'
import { sketchService } from '@/api/sketch-service'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import IconPicker from '@/components/shared/icon-picker'
import Relationships from './relationships'
import NeighborsGraph from './neighbors'
import { Circle, Square, Triangle, Hexagon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { MinimalTiptapEditor } from '@/components/analyses/editor/minimal-tiptap'
import type { Content } from '@tiptap/react'

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const formatDate = (value: unknown): string => {
  if (!value) return '—'
  try {
    return new Date(value as string).toLocaleDateString('en-US', {
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

// ── Sub-components ────────────────────────────────────────────────────────────

function TitleInput({
  value,
  onChange
}: {
  value: string
  onChange: (val: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = useCallback(() => {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }, [draft, value, onChange])

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-2xl font-bold">
          {value || <span className="text-muted-foreground/40">Untitled</span>}
        </span>
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-muted-foreground/40"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
      placeholder="Untitled"
    />
  )
}

function CollapsibleSection({
  label,
  defaultOpen = true,
  noBorderTop = false,
  children
}: {
  label: string
  defaultOpen?: boolean
  noBorderTop?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn(!noBorderTop && 'border-t')}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        {open ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRightIcon className="size-3.5" />
        )}
        {label}
      </button>
      {open && children}
    </div>
  )
}

function PropertyRow({
  label,
  copyValue,
  children
}: {
  label: string
  copyValue?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[40%_1fr] items-center gap-2 px-6 py-1.5 group hover:bg-muted/50 transition-colors">
      <span className="text-sm text-muted-foreground truncate">{label.replace(/_/g, ' ')}</span>
      <div className="min-w-0 text-sm flex items-center gap-1.5">
        <div className="min-w-0 flex-1">{children}</div>
        {copyValue && (
          <CopyButton
            content={copyValue}
            className="size-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
          />
        )}
      </div>
    </div>
  )
}

function PropertyInput({
  value,
  placeholder,
  onBlur
}: {
  value: string
  placeholder?: string
  onBlur: (val: string) => void
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onBlur(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onBlur(draft)
      }}
      className="w-full bg-transparent outline-none placeholder:text-muted-foreground/30 focus:bg-muted/20 px-1 rounded transition-colors"
      placeholder={placeholder ?? 'Empty'}
    />
  )
}

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
StatusCodeBadge.displayName = 'StatusCodeBadge'

// ── Main Component ────────────────────────────────────────────────────────────

const DetailsPanel = memo(() => {
  const { id: sketchId } = useParams({ strict: false })
  const nodesLength = useGraphStore((s) => s.nodesLength)
  const node = useGraphStore((s) => s.getCurrentNode())
  const setCurrentNodeId = useGraphStore((s) => s.setCurrentNodeId)
  const updateNode = useGraphStore((s) => s.updateNode)
  const [openIconPicker, setOpenIconPicker] = useState(false)

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

  // Refs to always read latest values without stale closures
  const formDataRef = useRef(formData)
  const nodeSizeRef = useRef(nodeSize)

  const IconComponent = useIcon(node?.nodeType as string, {
    nodeColor: node?.nodeColor,
    nodeIcon: node?.nodeIcon,
    nodeImage: node?.nodeImage
  })

  // Sync form when selected node changes
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
        nodeSize: ns
      } = node
      const fd: FormData = {
        nodeLabel: nodeLabel || '',
        nodeProperties: nodeProperties || {},
        nodeMetadata: nodeMetadata || {},
        nodeColor,
        nodeIcon,
        nodeImage,
        nodeFlag,
        nodeShape,
        nodeSize: ns,
        notes: (nodeMetadata?.notes as string) || ''
      }
      formDataRef.current = fd
      setFormData(fd)
      nodeSizeRef.current = ns ?? 0
      setNodeSize(ns ?? 0)
    }
  }, [node])

  const queryClient = useQueryClient()

  const updateNodeMutation = useMutation({
    mutationFn: async ({
      sketchId,
      body
    }: {
      sketchId: string
      body: { nodeId: string; updates: Partial<GraphNode> }
    }) => sketchService.updateNode(sketchId, JSON.stringify(body)),
    onSuccess: (result, variables) => {
      if (result.status === 'node updated' && node) {
        updateNode(node.id, variables.body.updates)
        if (sketchId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.sketches.detail(sketchId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.sketches.graph(sketchId, sketchId) })
        }
      } else {
        toast.error('Failed to update')
      }
    },
    onError: () => toast.error('Failed to save')
  })

  const saveState = useCallback(
    (fd: FormData, ns: number) => {
      if (!node || !sketchId) return
      const { notes, ...rest } = fd
      updateNodeMutation.mutate({
        sketchId,
        body: {
          nodeId: node.id,
          updates: {
            ...rest,
            nodeSize: ns,
            nodeType: node.nodeType,
            nodeMetadata: { ...rest.nodeMetadata, notes }
          } as Partial<GraphNode>
        }
      })
    },
    [node, sketchId, updateNodeMutation]
  )

  // Debounced save (for notes and slider)
  const pendingSaveRef = useRef<{ fd: FormData; ns: number } | null>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const scheduleSave = useCallback(
    (fd: FormData, ns: number) => {
      pendingSaveRef.current = { fd, ns }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        if (pendingSaveRef.current) {
          saveState(pendingSaveRef.current.fd, pendingSaveRef.current.ns)
          pendingSaveRef.current = null
        }
      }, 800)
    },
    [saveState]
  )

  // Handlers — all use refs to avoid stale closures

  const handleLabelCommit = useCallback(
    (label: string) => {
      const newFd = { ...formDataRef.current, nodeLabel: label }
      formDataRef.current = newFd
      setFormData(newFd)
      saveState(newFd, nodeSizeRef.current)
    },
    [saveState]
  )

  const handleChange = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      const newFd = { ...formDataRef.current, [key]: value }
      formDataRef.current = newFd
      setFormData(newFd)
      saveState(newFd, nodeSizeRef.current)
    },
    [saveState]
  )

  const handlePropertyBlur = useCallback(
    (key: string, value: string | boolean) => {
      const newFd = {
        ...formDataRef.current,
        nodeProperties: { ...formDataRef.current.nodeProperties, [key]: value }
      }
      formDataRef.current = newFd
      setFormData(newFd)
      saveState(newFd, nodeSizeRef.current)
    },
    [saveState]
  )

  const handleSizeChange = useCallback(
    (val: number) => {
      nodeSizeRef.current = val
      setNodeSize(val)
      scheduleSave(formDataRef.current, val)
    },
    [scheduleSave]
  )

  const handleNotesChange = useCallback(
    (val: Content) => {
      const notes = val as string
      const newFd = { ...formDataRef.current, notes }
      formDataRef.current = newFd
      setFormData(newFd)
      scheduleSave(newFd, nodeSizeRef.current)
    },
    [scheduleSave]
  )

  const handleIconSelect = useCallback(
    (_iconType: string, iconName: string | null) => {
      const newFd = { ...formDataRef.current, nodeIcon: iconName }
      formDataRef.current = newFd
      setFormData(newFd)
      saveState(newFd, nodeSizeRef.current)
    },
    [saveState]
  )

  // ── Empty state ─────────────────────────────────────────────────────────────

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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Hero */}
      <div className="px-6 pt-5 pb-4 space-y-3 shrink-0">
        <div className="flex items-start gap-3">
          <button
            onClick={() => setOpenIconPicker(true)}
            className="shrink-0 mt-1.5 hover:opacity-70 transition-opacity"
          >
            <IconComponent size={24} />
          </button>
          <TitleInput value={formData.nodeLabel} onChange={handleLabelCommit} />
          <div className="shrink-0 mt-0.5">
            <NodeActions node={node} />
          </div>
        </div>
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
          {node.nodeType}
        </span>
      </div>

      {/* Enrich CTA */}
      <div className="px-6 pb-4 shrink-0">
        <LaunchFlow values={[node.id]} type={node.nodeType}>
          <Button className="rounded-full h-8 gap-1.5 px-4 text-sm" size="sm">
            <Rocket className="size-3.5" strokeWidth={1.7} />
            Enrich
          </Button>
        </LaunchFlow>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="properties" className="flex-1 min-h-0 flex flex-col overflow-hidden gap-0">
        <div className="px-3 pb-0 shrink-0 border-b">
          <TabsList className="w-full h-9 bg-transparent rounded-none p-0 gap-0">
            <TabsTrigger
              value="properties"
              className="flex-1 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-full"
            >
              Properties
            </TabsTrigger>
            <TabsTrigger
              value="neighbors"
              className="flex-1 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-full"
            >
              Neighbors
            </TabsTrigger>
            <TabsTrigger
              value="relations"
              className="flex-1 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-full"
            >
              Relations
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="flex-1 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-full"
            >
              Style
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Properties tab */}
        <TabsContent value="properties" className="flex-1 min-h-0 overflow-y-auto mt-0 pb-6">
          <CollapsibleSection label="Properties" defaultOpen noBorderTop>
            {propertiesFields.length > 0 ? (
              propertiesFields.map(([key, value]) => (
                <PropertyRow
                  key={key}
                  label={key}
                  copyValue={typeof value === 'string' ? value : undefined}
                >
                  {typeof value === 'boolean' ? (
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => handlePropertyBlur(key, checked)}
                      className="scale-75"
                    />
                  ) : typeof value === 'number' ? (
                    <StatusCodeBadge statusCode={value} />
                  ) : typeof value === 'string' && value.startsWith('https://') ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <Link2 className="size-3 shrink-0" />
                      <span className="truncate">{new URL(value).hostname}</span>
                    </a>
                  ) : value && typeof value === 'object' && value.constructor === Object ? (
                    <PopoverProperty label={key} property={value as object} />
                  ) : (
                    <PropertyInput
                      value={String(value || '')}
                      onBlur={(val) => handlePropertyBlur(key, val)}
                    />
                  )}
                </PropertyRow>
              ))
            ) : (
              <p className="px-6 py-2 text-sm text-muted-foreground/40">No properties</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection label="Notes" defaultOpen>
            <div className="min-h-[120px]">
              <MinimalTiptapEditor
                value={formData.notes}
                onChange={handleNotesChange}
                output="html"
                placeholder="Write something..."
                showToolbar={false}
                editorContentClassName="px-6 py-3 !max-w-none prose-sm"
                immediatelyRender={false}
              />
            </div>
          </CollapsibleSection>

          {metadataFields.length > 0 && (
            <CollapsibleSection label="Metadata" defaultOpen={false}>
              {metadataFields.map(([key, value]) => (
                <PropertyRow
                  key={key}
                  label={key}
                  copyValue={typeof value === 'string' ? value : undefined}
                >
                  <span className="text-muted-foreground truncate">
                    {key.includes('_at') || key.includes('date')
                      ? formatDate(value)
                      : formatValue(value)}
                  </span>
                </PropertyRow>
              ))}
            </CollapsibleSection>
          )}
        </TabsContent>

        {/* Neighbors tab */}
        <TabsContent value="neighbors" className="flex-1 min-h-0 overflow-hidden mt-0">
          <NeighborsGraph
            sketchId={sketchId as string}
            currentNode={node}
            nodeLength={nodesLength}
          />
        </TabsContent>

        {/* Relations tab */}
        <TabsContent value="relations" className="flex-1 min-h-0 overflow-y-auto mt-0 pb-6">
          <div className="p-4">
            <Relationships
              sketchId={sketchId as string}
              nodeId={node.id}
              nodeLength={nodesLength}
            />
          </div>
        </TabsContent>

        {/* Appearance tab */}
        <TabsContent value="appearance" className="flex-1 min-h-0 overflow-y-auto mt-0 pb-6">
          <CollapsibleSection label="Visual" defaultOpen noBorderTop>
            <PropertyRow label={`Size (${nodeSize})`}>
              <Slider
                value={[nodeSize]}
                onValueChange={([val]) => handleSizeChange(val)}
                min={0}
                max={100}
                step={1}
              />
            </PropertyRow>

            <PropertyRow label="Color">
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleChange('nodeColor', color.value)}
                    className={cn(
                      'w-4 h-4 rounded-full transition-all',
                      color.value ? '' : 'bg-muted-foreground/20',
                      formData.nodeColor === color.value &&
                        'ring-1 ring-offset-1 ring-offset-background ring-foreground/40'
                    )}
                    style={color.value ? { backgroundColor: color.value } : undefined}
                  />
                ))}
              </div>
            </PropertyRow>

            <PropertyRow label="Shape">
              <ToggleGroup
                onValueChange={(value) => handleChange('nodeShape', value || null)}
                type="single"
                size="sm"
                defaultValue={node.nodeShape || 'circle'}
                variant="outline"
                className="shadow-none!"
              >
                {(
                  Object.entries(NODE_SHAPES) as [NodeShape, (typeof NODE_SHAPES)[NodeShape]][]
                ).map(([shape, Icon]) => (
                  <ToggleGroupItem key={shape} value={shape} aria-label={shape}>
                    <Icon size={14} />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </PropertyRow>

            <PropertyRow label="Icon">
              <button
                onClick={() => setOpenIconPicker(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {formData.nodeIcon || 'Default'}
              </button>
            </PropertyRow>

            <PropertyRow label="Image">
              <PropertyInput
                value={formData.nodeImage || ''}
                placeholder="URL..."
                onBlur={(val) => {
                  const newFd = { ...formDataRef.current, nodeImage: val || null }
                  formDataRef.current = newFd
                  setFormData(newFd)
                  saveState(newFd, nodeSizeRef.current)
                }}
              />
            </PropertyRow>
          </CollapsibleSection>
        </TabsContent>
      </Tabs>

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

DetailsPanel.displayName = 'DetailsPanel'

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
            <div key={key}>
              {key} : {JSON.stringify(value)}
            </div>
          ))}
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}
