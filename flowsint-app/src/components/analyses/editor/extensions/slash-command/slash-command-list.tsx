import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react'
import type { SlashCommandItem } from './slash-command'
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Minus,
  ImageIcon
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Minus,
  ImageIcon
}

export interface SlashCommandListProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

export interface SlashCommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const SlashCommandList = forwardRef<SlashCommandListRef, SlashCommandListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = useCallback(
    (index: number) => {
      const item = props.items[index]
      if (item) {
        props.command(item)
      }
    },
    [props]
  )

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + props.items.length - 1) % props.items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % props.items.length)
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }
      return false
    }
  }))

  // Group items by category
  const grouped = props.items.reduce<Record<string, SlashCommandItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  // Flat index tracking
  let flatIndex = -1

  if (!props.items.length) {
    return (
      <div className="z-50 w-[280px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
        <div className="px-2 py-1.5 text-sm text-muted-foreground">No results</div>
      </div>
    )
  }

  return (
    <div className="z-50 w-[280px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
      <div className="overflow-y-auto max-h-[300px] p-1">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{category}</div>
            {items.map((item) => {
              flatIndex++
              const currentIndex = flatIndex
              const Icon = iconMap[item.icon]
              return (
                <button
                  key={item.title}
                  className={`relative flex w-full cursor-pointer select-none items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${
                    currentIndex === selectedIndex ? 'bg-accent text-accent-foreground' : ''
                  }`}
                  onClick={() => selectItem(currentIndex)}
                  type="button"
                >
                  {Icon && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
                      <Icon size={16} />
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
})

SlashCommandList.displayName = 'SlashCommandList'

export { SlashCommandList }
export default SlashCommandList
