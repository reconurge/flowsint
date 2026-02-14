import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { customTypeService, CustomType } from '@/api/custom-type-service'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Eye, EyeOff } from 'lucide-react'
import { Reorder } from 'framer-motion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ColorPicker } from '@/components/shared/color-picker'
import { IconPickerTrigger } from '@/components/custom-types/icon-picker-trigger'
import { FieldRow, type SchemaField } from '@/components/custom-types/field-row'
import { TypePreview } from '@/components/custom-types/type-preview'
import { Skeleton } from '@/components/ui/skeleton'
import { useNodesDisplaySettings } from '@/stores/node-display-settings'
import { clearIconTypeCache } from '@/components/sketches/graph/utils/image-cache'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'

export const Route = createFileRoute('/_auth/dashboard/custom-types/$typeId')({
  component: CustomTypeEditor
})

const DEFAULT_COLOR = '#8E7CC3'
const DEFAULT_ICON = 'FileQuestion'

function CustomTypeEditor() {
  const { typeId: id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = id === 'new'

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [icon, setIcon] = useState(DEFAULT_ICON)
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [fields, setFields] = useState<SchemaField[]>([])
  const [showPreview, setShowPreview] = useState(true)

  // Load existing type if editing
  const { data: existingType, isLoading } = useQuery<CustomType>({
    queryKey: ['custom-type', id],
    queryFn: () => customTypeService.getById(id),
    enabled: !isNew
  })

  useEffect(() => {
    if (existingType) {
      setName(existingType.name)
      setDescription(existingType.description || '')
      setStatus(existingType.status === 'archived' ? 'draft' : existingType.status)
      setIcon(existingType.icon || DEFAULT_ICON)
      setColor(existingType.color || DEFAULT_COLOR)
      parseSchemaToFields(existingType.schema)
    } else if (isNew) {
      addField()
    }
  }, [existingType, isNew])

  const parseSchemaToFields = (schema: any) => {
    const properties = schema.properties || {}
    const required = schema.required || []
    const parsedFields: SchemaField[] = Object.entries(properties).map(
      ([key, value]: [string, any]) => ({
        id: Math.random().toString(36).substr(2, 9),
        key,
        title: value.title || key,
        type: value.type || 'string',
        format: value.format,
        description: value.description,
        required: required.includes(key)
      })
    )
    setFields(parsedFields)
  }

  const fieldsToSchema = () => {
    const properties: any = {}
    const required: string[] = []
    fields.forEach((field) => {
      if (!field.key.trim()) return
      const prop: any = { type: field.type, title: field.title || field.key }
      if (field.description) prop.description = field.description
      if (field.format && field.format !== 'none') prop.format = field.format
      properties[field.key] = prop
      if (field.required) required.push(field.key)
    })
    return { title: name || 'MyCustomType', type: 'object', properties, required }
  }

  const addField = () => {
    setFields([
      ...fields,
      {
        id: Math.random().toString(36).substr(2, 9),
        key: '',
        title: '',
        type: 'string',
        required: false
      }
    ])
  }

  const updateField = (id: string, updates: Partial<SchemaField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const deleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id))
  }

  const { setColor: setDisplayColor, setIcon: setDisplayIcon } = useNodesDisplaySettings()

  const syncDisplaySettings = () => {
    const typeName = name.trim().toLowerCase().replace(/\s+/g, '')
    setDisplayColor(typeName as any, color)
    setDisplayIcon(typeName, icon as any)
    clearIconTypeCache(typeName)
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => customTypeService.create(data),
    onSuccess: () => {
      syncDisplaySettings()
      queryClient.invalidateQueries({ queryKey: ['custom-types'] })
      queryClient.invalidateQueries({ queryKey: ['actionItems'] })
      toast.success('Custom type created')
      navigate({ to: '/dashboard/custom-types' })
    },
    onError: (error: Error) => {
      toast.error(`Failed to create: ${error.message}`)
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => customTypeService.update(id, data),
    onSuccess: () => {
      syncDisplaySettings()
      queryClient.invalidateQueries({ queryKey: ['custom-types'] })
      queryClient.invalidateQueries({ queryKey: ['custom-type', id] })
      queryClient.invalidateQueries({ queryKey: ['actionItems'] })
      toast.success('Changes saved')
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`)
    }
  })

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a name')
      return
    }
    const keys = fields.map((f) => f.key.trim()).filter((k) => k)
    if (new Set(keys).size !== keys.length) {
      toast.error('Field keys must be unique')
      return
    }
    if (fields.length === 0 || fields.every((f) => !f.key.trim())) {
      toast.error('Add at least one field')
      return
    }

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      schema: fieldsToSchema(),
      icon,
      color,
      status
    }

    if (isNew) {
      createMutation.mutate(data)
    } else {
      updateMutation.mutate(data)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  useKeyboardShortcut({
    key: 's',
    ctrlOrCmd: true,
    callback: handleSave
  })

  if (!isNew && isLoading) {
    return (
      <div className="h-full w-full overflow-y-auto bg-background">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="flex items-center gap-4 mb-10">
            <Skeleton className="h-[52px] w-[52px] rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-8 px-2"
              onClick={() => navigate({ to: '/dashboard/custom-types' })}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="text-sm">Types</span>
            </Button>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
              {isNew ? 'New type' : name || 'Untitled'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <EyeOff className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <Eye className="w-3.5 h-3.5 mr-1.5" />
              )}
              Preview
            </Button>
            <Button size="sm" className="h-8" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : isNew ? 'Create' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className={showPreview ? 'flex gap-10' : ''}>
          <div className="space-y-10">
            <div className="space-y-5 flex items-start">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2 pt-1">
                  <IconPickerTrigger icon={icon} color={color} onIconChange={setIcon} />
                  <ColorPicker value={color} onChange={setColor} />
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Untitled type"
                    className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/30 text-foreground tracking-tight"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={1}
                    className="w-full text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-muted-foreground resize-none leading-relaxed"
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = target.scrollHeight + 'px'
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground/60">Status</span>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger className="w-[130px] h-7 text-xs border-border/40 bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                        Draft
                      </div>
                    </SelectItem>
                    <SelectItem value="published">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Published
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator className="opacity-40" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Properties</h2>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Define the data structure for this entity type
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={addField}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add property
                </Button>
              </div>

              {fields.length === 0 ? (
                <button
                  onClick={addField}
                  className="w-full py-10 border border-dashed border-border/50 rounded-lg text-sm text-muted-foreground/50 hover:text-muted-foreground hover:border-border transition-colors"
                >
                  <Plus className="w-4 h-4 mx-auto mb-2 opacity-50" />
                  Add your first property
                </button>
              ) : (
                <div className="space-y-px">
                  {/* Column headers */}
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <div className="w-[52px] shrink-0" />
                    <div className="flex-1 grid grid-cols-[1fr_1fr_120px_120px] gap-2">
                      <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                        Key
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                        Label
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                        Type
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                        Format
                      </span>
                    </div>
                    <div className="w-9 shrink-0" />
                  </div>

                  <Reorder.Group
                    axis="y"
                    values={fields}
                    onReorder={setFields}
                    className="space-y-1"
                  >
                    {fields.map((field) => (
                      <FieldRow
                        key={field.id}
                        field={field}
                        onUpdate={(updates) => updateField(field.id, updates)}
                        onDelete={() => deleteField(field.id)}
                      />
                    ))}
                  </Reorder.Group>

                  {/* Add row button */}
                  <button
                    onClick={addField}
                    className="w-full flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New property
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Preview panel */}
          {showPreview && (
            <div className="border-l border-border/30 pl-8">
              <div className="sticky top-16">
                <TypePreview
                  name={name}
                  description={description}
                  icon={icon}
                  color={color}
                  fields={fields}
                  status={status}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
