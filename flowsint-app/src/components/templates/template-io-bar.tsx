import { ArrowRight } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useActionItems } from '@/hooks/use-action-items'
import type { ActionItem } from '@/lib/action-items'

interface TemplateIOBarProps {
  inputType: string | undefined
  outputType: string | undefined
  onInputTypeChange: (type: string) => void
  onOutputTypeChange: (type: string) => void
}

function flattenTypes(items: ActionItem[]): ActionItem[] {
  const result: ActionItem[] = []
  for (const item of items) {
    if (item.children?.length) {
      result.push(...item.children)
    } else {
      result.push(item)
    }
  }
  return result
}

function groupByCategory(items: ActionItem[]): Map<string, ActionItem[]> {
  const groups = new Map<string, ActionItem[]>()
  for (const item of items) {
    if (item.children?.length) {
      groups.set(item.label, item.children)
    }
  }
  if (groups.size === 0) {
    groups.set('Types', items)
  }
  return groups
}

export function TemplateIOBar({
  inputType,
  outputType,
  onInputTypeChange,
  onOutputTypeChange
}: TemplateIOBarProps) {
  const { actionItems } = useActionItems()

  const groups = actionItems ? groupByCategory(actionItems) : new Map()
  const flat = actionItems ? flattenTypes(actionItems) : []

  return (
    <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 border-b bg-card/15">
      <TypeSelect
        value={inputType}
        onValueChange={onInputTypeChange}
        groups={groups}
        flat={flat}
        placeholder="Input type"
      />

      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />

      <TypeSelect
        value={outputType}
        onValueChange={onOutputTypeChange}
        groups={groups}
        flat={flat}
        placeholder="Output type"
      />
    </div>
  )
}

function TypeSelect({
  value,
  onValueChange,
  groups,
  flat,
  placeholder
}: {
  value: string | undefined
  onValueChange: (v: string) => void
  groups: Map<string, ActionItem[]>
  flat: ActionItem[]
  placeholder: string
}) {
  const matched = flat.find((t) => t.type === value)

  return (
    <Select value={value || ''} onValueChange={onValueChange}>
      <SelectTrigger
        size="sm"
        className="h-7 border-none bg-transparent shadow-none px-2 text-xs font-medium gap-1.5 hover:bg-accent/50 transition-colors focus-visible:ring-0"
      >
        <SelectValue placeholder={placeholder}>
          {matched ? matched.label : value || placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {groups.size > 0
          ? Array.from(groups.entries()).map(([category, items]) => (
              <SelectGroup key={category}>
                <SelectLabel>{category}</SelectLabel>
                {items.map((item) => (
                  <SelectItem key={item.type} value={item.type}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          : flat.map((item) => (
              <SelectItem key={item.type} value={item.type}>
                {item.label}
              </SelectItem>
            ))}
      </SelectContent>
    </Select>
  )
}
