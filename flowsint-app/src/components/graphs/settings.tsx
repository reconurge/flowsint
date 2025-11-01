import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'

import { useGraphSettingsStore } from '@/stores/graph-settings-store'
import { isMacOS } from '@/components/analyses/editor/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sketch } from '@/types'
import { useParams } from '@tanstack/react-router'
import { sketchService } from '@/api/sketch-service'
import { useState, useEffect } from 'react'
import { queryKeys } from '@/api/query-keys'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

// SettingItem Components
interface SettingItemProps {
  label: string
  description?: string
  children: React.ReactNode
  inline?: boolean
}

function SettingItem({ label, description, children, inline = false }: SettingItemProps) {
  if (inline) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2">
        <div className="space-y-1 flex-1">
          <Label className="text-sm font-medium text-foreground">{label}</Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="sm:ml-4">{children}</div>
      </div>
    )
  }

  return (
    <div className="space-y-2 py-1">
      <div className="space-y-1">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

// Dynamic Setting Components
interface DynamicSettingProps {
  categoryId: string
  settingKey: string
  setting: any
  onValueChange: (value: any) => void
}

function DynamicSetting({ categoryId, settingKey, setting, onValueChange }: DynamicSettingProps) {
  // For force settings, always use slider regardless of type
  const shouldUseSlider = categoryId === 'graph' || setting.type === 'slider'

  if (shouldUseSlider && (setting.type === 'number' || setting.type === 'slider')) {
    return (
      <SettingItem label={settingKey} description={setting.description} inline={false}>
        <div className="flex items-center space-x-3">
          <Slider
            value={[setting.value]}
            onValueChange={([value]) => onValueChange(value)}
            min={setting.min || 0}
            max={setting.max || 100}
            step={setting.step || 1}
            className="flex-1"
          />
          <Input
            type="number"
            value={setting.value}
            onChange={(e) => onValueChange(Number(e.target.value))}
            min={setting.min}
            max={setting.max}
            step={setting.step}
            className="h-9 w-20"
          />
        </div>
      </SettingItem>
    )
  }

  switch (setting.type) {
    case 'boolean':
      return (
        <SettingItem label={settingKey} description={setting.description} inline={true}>
          <div className="flex items-center space-x-2">
            <Switch checked={setting.value} onCheckedChange={onValueChange} />
            <span className="text-sm text-muted-foreground">
              {setting.value ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </SettingItem>
      )

    case 'select':
      return (
        <SettingItem label={settingKey} description={setting.description} inline={true}>
          <Select value={setting.value} onValueChange={onValueChange}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingItem>
      )

    case 'text':
      return (
        <SettingItem label={settingKey} description={setting.description} inline={false}>
          <Input
            type="text"
            value={setting.value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="Enter value"
            className="h-10"
          />
        </SettingItem>
      )

    case 'textarea':
      return (
        <SettingItem label={settingKey} description={setting.description} inline={false}>
          <Textarea
            value={setting.value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="Enter value"
            rows={4}
            className="resize-none"
          />
        </SettingItem>
      )

    case 'color':
      return (
        <SettingItem label={settingKey} description={setting.description} inline={true}>
          <div className="flex items-center space-x-2">
            <Input
              type="color"
              value={setting.value}
              onChange={(e) => onValueChange(e.target.value)}
              className="h-9 w-12 p-1"
            />
            <Input
              type="text"
              value={setting.value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder="#000000"
              className="h-9 w-24"
            />
          </div>
        </SettingItem>
      )

    case 'number':
      return (
        <SettingItem label={settingKey} description={setting.description} inline={true}>
          <Input
            type="number"
            value={setting.value}
            onChange={(e) => onValueChange(Number(e.target.value))}
            placeholder="Enter number"
            min={setting.min}
            max={setting.max}
            step={setting.step}
            className="h-9 w-32"
          />
        </SettingItem>
      )

    default:
      return (
        <SettingItem label={settingKey} description={setting.description} inline={false}>
          <div className="text-sm text-muted-foreground">Unknown setting type: {setting.type}</div>
        </SettingItem>
      )
  }
}

// Dynamic Section Renderer
interface DynamicSectionProps {
  categoryId: string
  category: any
  title: string
  description: string
}

function DynamicSection({ categoryId, category, title, description }: DynamicSectionProps) {
  const getPresets = useGraphSettingsStore((s) => s.getPresets)
  const applyPreset = useGraphSettingsStore((s) => s.applyPreset)
  const resetSettings = useGraphSettingsStore((s) => s.resetSettings)
  const updateSetting = useGraphSettingsStore((s) => s.updateSetting)

  if (!category) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          No settings available for category: {category}
          <br />
          Available categories: {Object.keys(category || {}).join(', ')}
        </div>
      </div>
    )
  }

  const handleSettingChange = (settingKey: string, value: any) => {
    updateSetting(categoryId, settingKey, value)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Special handling for force section */}
      {categoryId === 'graph' && (
        <div className="border-b pb-6">
          <div className="space-y-1">
            <h4 className="text-md font-semibold text-foreground">Force graph presets</h4>
            <p className="text-sm text-muted-foreground">
              Apply predefined configurations for different graph layouts.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {Object.keys(getPresets()).map((presetName) => (
              <Button
                key={presetName}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(presetName)}
                className="justify-start"
              >
                {presetName}
              </Button>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => resetSettings()} className="w-full">
              Reset to Defaults
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-5 pb-6">
        {Object.entries(category).map(([settingKey, setting]) => (
          <DynamicSetting
            key={settingKey}
            categoryId={categoryId}
            settingKey={settingKey}
            setting={setting}
            onValueChange={(value) => handleSettingChange(settingKey, value)}
          />
        ))}
      </div>
    </div>
  )
}

export default function GlobalSettings() {
  const settingsModalOpen = useGraphSettingsStore((s) => s.settingsModalOpen)
  const setSettingsModalOpen = useGraphSettingsStore((s) => s.setSettingsModalOpen)
  const settings = useGraphSettingsStore((s) => s.settings)
  const queryClient = useQueryClient()

  const [activeSection, setActiveSection] = useState('information')

  const { id, investigationId } = useParams({ strict: false })
  const {
    data: sketch,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['investigations', investigationId, 'graph', id],
    queryFn: () => sketchService.getById(id as string),
    refetchOnWindowFocus: false,
    enabled: Boolean(id)
  })

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'active'
  })

  // Update form data when sketch data changes
  useEffect(() => {
    if (sketch) {
      setFormData({
        title: sketch.title || '',
        description: sketch.description || '',
        status: sketch.status || 'active'
      })
    }
  }, [sketch])

  const updateMutation = useMutation({
    mutationFn: async (updated: Partial<Sketch>) => {
      if (!id) return
      return sketchService.update(id, JSON.stringify(updated))
    },
    onSuccess: async (data) => {
      if (!id || !investigationId) return

      // Update the query cache using query key factory
      queryClient.setQueryData(queryKeys.sketches.graph(investigationId, id), data)
      // Also update the sketches list if it exists
      queryClient.setQueryData(
        queryKeys.investigations.sketches(investigationId),
        (oldData: any) => {
          if (!oldData?.sketches) return oldData
          return {
            ...oldData,
            sketches: oldData.sketches.map((s: Sketch) => (s.id === id ? data : s))
          }
        }
      )
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.sketches.detail(id)
      })
      toast.success('Sketch updated successfully')
      setSettingsModalOpen(false)
    },
    onError: (error) => {
      toast.error(
        'Failed to update sketch: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  if (isLoading) {
    return (
      <Sheet open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>General settings</SheetTitle>
            <SheetDescription>
              Make changes to your sketch settings here. Click save when you&apos;re done.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 mt-6">
            <div className="grid gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  if (isError) {
    return (
      <Sheet open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>General settings</SheetTitle>
            <SheetDescription>Error loading sketch data. Please try again.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 mt-6">
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const getSelectedSectionPanel = (sectionId: string) => {
    if (sectionId === 'information') {
      return (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">General Information</h3>
            <p className="text-sm text-muted-foreground">
              Configure the basic details and metadata for your sketch.
            </p>
          </div>

          <div className="space-y-5">
            <TextSetting
              label="Title"
              description="The name of your sketch"
              value={formData.title}
              onValueChange={(value) => handleInputChange('title', value)}
              placeholder="Enter sketch title"
            />

            <TextareaSetting
              label="Description"
              description="A brief description of what this sketch represents"
              value={formData.description}
              onValueChange={(value) => handleInputChange('description', value)}
              placeholder="Enter sketch description"
              rows={4}
            />

            <SelectSetting
              label="Status"
              description="The current status of this sketch"
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'archived', label: 'Archived' }
              ]}
              placeholder="Select status"
            />
          </div>

          <div className="flex gap-3 pt-6">
            <SheetClose asChild>
              <Button variant="outline" type="button" className="flex-1">
                Cancel
              </Button>
            </SheetClose>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              onClick={handleSubmit}
              className="flex-1"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )
    }

    // For all other sections, use the dynamic renderer
    // @ts-ignore
    const category = settings[sectionId]
    if (category) {
      return (
        <DynamicSection
          categoryId={sectionId}
          category={category}
          title={category.title}
          description={category.description}
        />
      )
    }

    return <div>Section not found.</div>
  }

  return (
    <Sheet open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col overflow-hidden p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>Sketch settings</SheetTitle>
          <SheetDescription>Configure your sketch settings and preferences.</SheetDescription>
        </SheetHeader>
        <Tabs
          value={activeSection}
          onValueChange={setActiveSection}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Horizontal tabs at top */}
          <div className="px-6 pb-4 border-b">
            <TabsList className="w-full h-auto flex">
              {Object.keys(settings).map((category: string) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="capitalize h-9"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Content panel */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {Object.keys(settings).map((category: string) => (
              <TabsContent
                key={category}
                value={category}
                className="mt-0 h-full flex flex-col"
              >
                {getSelectedSectionPanel(category)}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

// Legacy components for backward compatibility (keeping the general section working)
interface TextSettingProps {
  label: string
  description?: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'url' | 'number'
}

function TextSetting({
  label,
  description,
  value,
  onValueChange,
  placeholder,
  type = 'text'
}: TextSettingProps) {
  return (
    <SettingItem label={label} description={description} inline={false}>
      <Input
        type={type}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="h-10"
      />
    </SettingItem>
  )
}

interface TextareaSettingProps {
  label: string
  description?: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  rows?: number
}

function TextareaSetting({
  label,
  description,
  value,
  onValueChange,
  placeholder,
  rows = 4
}: TextareaSettingProps) {
  return (
    <SettingItem label={label} description={description} inline={false}>
      <Textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-none"
      />
    </SettingItem>
  )
}

interface SelectSettingProps {
  label: string
  description?: string
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}

function SelectSetting({
  label,
  description,
  value,
  onValueChange,
  options,
  placeholder
}: SelectSettingProps) {
  return (
    <SettingItem label={label} description={description} inline={true}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-9 w-48">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingItem>
  )
}

export function KeyboardShortcuts() {
  const keyboardShortcutsOpen = useGraphSettingsStore((s) => s.keyboardShortcutsOpen)
  const setKeyboardShortcutsOpen = useGraphSettingsStore((s) => s.setKeyboardShortcutsOpen)

  const isMac = isMacOS()
  const modKey = isMac ? '⌘' : 'Ctrl'

  const shortcuts = [
    {
      category: 'Navigation & Panels',
      items: [
        { key: `${modKey}+L`, description: 'Toggle Analysis Panel' },
        { key: `${modKey}+B`, description: 'Toggle Panel' },
        { key: `${modKey}+D`, description: 'Toggle Console' },
        { key: `${modKey}+J`, description: 'Open Command Palette' }
      ]
    },
    {
      category: 'Chat & Assistant',
      items: [
        { key: `${modKey}+E`, description: 'Toggle Chat Assistant' },
        { key: 'Escape', description: 'Close Chat Assistant' }
      ]
    },
    {
      category: 'File Operations',
      items: [{ key: `${modKey}+S`, description: 'Save (Analysis/Flow)' }]
    }
  ]

  return (
    <Sheet open={keyboardShortcutsOpen} onOpenChange={setKeyboardShortcutsOpen}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Keyboard Shortcuts</SheetTitle>
          <SheetDescription>
            Here is the list of all available keyboard shortcuts.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 mt-6">
          {shortcuts.map((category) => (
            <div key={category.category} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                  >
                    <span className="text-sm text-muted-foreground">{item.description}</span>
                    <kbd className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs font-mono font-medium text-foreground shadow-sm">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
