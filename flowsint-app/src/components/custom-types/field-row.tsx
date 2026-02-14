import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { GripVertical, Trash2, ChevronRight, Asterisk } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'

export interface SchemaField {
  id: string
  key: string
  title: string
  type: string
  format?: string
  description?: string
  required: boolean
}

const FIELD_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'integer', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'array', label: 'List' },
  { value: 'object', label: 'Object' }
] as const

const FIELD_FORMATS = [
  { value: 'none', label: 'None' },
  { value: 'email', label: 'Email' },
  { value: 'uri', label: 'URL' },
  { value: 'date', label: 'Date' },
  { value: 'date-time', label: 'Date & Time' },
  { value: 'ipv4', label: 'IPv4' },
  { value: 'ipv6', label: 'IPv6' }
] as const

interface FieldRowProps {
  field: SchemaField
  onUpdate: (updates: Partial<SchemaField>) => void
  onDelete: () => void
}

export function FieldRow({ field, onUpdate, onDelete }: FieldRowProps) {
  const [expanded, setExpanded] = useState(false)
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={field}
      dragListener={false}
      dragControls={dragControls}
      className="list-none"
      // whileDrag={{ scsale: 1.01, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', zIndex: 50 }}
      transition={{ duration: 0.15 }}
    >
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div
          className={cn(
            'group rounded-lg border bg-background relative',
            field.required && 'border-primary/20 bg-primary/3'
          )}
        >
          {field.required && (
            <div className="absolute -top-2 -left-2 rounded-full border border-primary/50 bg-card">
              <Asterisk className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex items-center gap-1 shrink-0">
              <button
                className="touch-none p-0.5 rounded hover:bg-muted transition-colors cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
              </button>
              <CollapsibleTrigger asChild>
                <button className="p-1 rounded hover:bg-muted transition-colors">
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 text-muted-foreground transition-transform',
                      expanded && 'rotate-90'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
            </div>

            <div className="flex-1 grid grid-cols-[1fr_1fr_120px_120px] gap-2 items-center">
              <Input
                value={field.key}
                onChange={(e) =>
                  onUpdate({ key: e.target.value.toLowerCase().replace(/\s+/g, '_') })
                }
                placeholder="field_key"
                className="h-8 text-sm border-transparent bg-transparent hover:border-border focus:border-border focus:bg-background transition-colors"
              />
              <Input
                value={field.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Display name"
                className="h-8 text-sm border-transparent bg-transparent hover:border-border focus:border-border focus:bg-background transition-colors"
              />
              <Select value={field.type} onValueChange={(v: string) => onUpdate({ type: v })}>
                <SelectTrigger className="h-8 text-sm border-transparent bg-transparent hover:border-border transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={field.format || 'none'}
                onValueChange={(v: string) => onUpdate({ format: v === 'none' ? undefined : v })}
              >
                <SelectTrigger className="h-8 text-sm border-transparent bg-transparent hover:border-border transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Expanded details */}
          <CollapsibleContent>
            <div className="px-10 pb-3 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Textarea
                    value={field.description || ''}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    placeholder="Describe what this field is for..."
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">
                      Required field
                    </label>
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked: boolean) => onUpdate({ required: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </Reorder.Item>
  )
}
