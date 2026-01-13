import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { cn } from '@/lib/utils'
import { ItemType } from '@/stores/node-display-settings'
import { useIcon } from '@/hooks/use-icon'

export interface MentionItem {
  value: string
  type: ItemType
  nodeId: string
}

export interface MentionListProps {
  items: MentionItem[]
  command: (item: { label: string; type: ItemType; nodeId: string }) => void
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]

    if (item) {
      props.command({ label: item.value, type: item.type, nodeId: item.nodeId })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    }
  }))

  return (
    <div className="z-50 min-w-32 max-w-[400px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
      {props.items.length ? (
        <div className="overflow-y-auto max-h-[300px]">
          {props.items.map((item, index) => (
            <MentionListItem
              item={item}
              index={index}
              selectedIndex={selectedIndex}
              selectItem={selectItem}
            />
          ))}
        </div>
      ) : (
        <div className="px-2 py-1.5 text-sm text-muted-foreground">No results</div>
      )}
    </div>
  )
})

type MentionItemProps = {
  item: MentionItem
  index: number
  selectedIndex: number
  selectItem: (index: number) => void
}
const MentionListItem = ({ item, index, selectedIndex, selectItem }: MentionItemProps) => {
  const Icon = useIcon(item.type, null) ?? null
  return (
    <button
      className={cn(
        'relative flex w-full justify-start cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:bg-accent focus:text-accent-foreground',
        index === selectedIndex && 'bg-accent text-accent-foreground'
      )}
      key={index}
      onClick={() => selectItem(index)}
      type="button"
    >
      {Icon && <Icon size={14} />}
      <span className="flex-1 text-left truncate text-ellipsis">{item.value}</span>
      <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
    </button>
  )
}
MentionList.displayName = 'MentionList'

export default MentionList
