import { Button } from '@/components/ui/button'
import { Download, PlusIcon, Search } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'
import { type ActionItem } from '@/lib/action-items'
import { DraggableItem } from '../../draggable-item'
import { Input } from '@/components/ui/input'
import { useActionItems } from '@/hooks/use-action-items'
import { SkeletonList } from '@/components/shared/skeleton-list'
import { useGraphStore } from '@/stores/graph-store'
import { useGraphSettingsStore } from '@/stores/graph-settings-store'

export const ItemsPanel = memo(function LeftPanel() {
  const [searchQuery, setSearchQuery] = useState<string>('')
  const setOpenMainDialog = useGraphStore((state) => state.setOpenMainDialog)
  const setImportModalOpen = useGraphSettingsStore((s) => s.setImportModalOpen)

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleOpenNewAddItemDialog = useCallback(() => {
    setOpenMainDialog(true)
  }, [setOpenMainDialog])

  const handleOpenImportModal = useCallback(() => {
    setImportModalOpen(true)
  }, [setImportModalOpen])

  const { actionItems, isLoading } = useActionItems()

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return actionItems
    if (!actionItems) return actionItems

    return actionItems
      .map((item) => {
        const parentMatches = item.label.toLowerCase().includes(query)
        if (item.children && item.children.length > 0) {
          const filteredChildren = item.children.filter((child) => {
            const childMatchesLabel = child.label.toLowerCase().includes(query)
            const childMatchesFields = (child.fields || []).some(
              (f) => f.label.toLowerCase().includes(query) || f.name.toLowerCase().includes(query)
            )
            return childMatchesLabel || childMatchesFields
          })
          if (parentMatches || filteredChildren.length > 0) {
            return { ...item, children: filteredChildren }
          }
          return null
        }
        const itemMatchesFields = (item.fields || []).some(
          (f) => f.label.toLowerCase().includes(query) || f.name.toLowerCase().includes(query)
        )
        return parentMatches || itemMatchesFields ? item : null
      })
      .filter(Boolean) as ActionItem[]
  }, [actionItems, searchQuery])

  return (
    <div className="bg-card p-4 h-full w-full overflow-y-auto flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div>
          <Button
            onClick={handleOpenNewAddItemDialog}
            className="h-7 !w-7"
            size="icon"
            variant={'ghost'}
          >
            <PlusIcon />
          </Button>
        </div>
        <div className="relative grow">
          <Search className="absolute left-2.5 top-1.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search type..."
            className="pl-8 h-7 border-border"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>
      <div className='my-1'>
        <Button onClick={handleOpenImportModal} className="w-full shadow-none" variant={"outline"}><Download /> Import entities</Button>
      </div>
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <SkeletonList rowCount={8} />
        ) : (
          (filteredItems || actionItems)?.map((item: ActionItem) => {
            if (item.children && item.children.length > 0) {
              return (
                <div key={item.id}>
                  <div className="py-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>
                        {item.label} ({item.children.length})
                      </span>
                      {item.comingSoon && (
                        <span className="ml-1 text-xs text-muted-foreground">(Soon)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {item.children.map((childItem) => (
                      <DraggableItem
                        key={childItem.id}
                        itemKey={childItem.key}
                        label={childItem.label}
                        icon={childItem.icon}
                        type={childItem.type}
                        color={childItem.color}
                        disabled={childItem.disabled}
                        description={childItem.description}
                      />
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <DraggableItem
                key={item.id}
                label={item.label}
                itemKey={item.key}
                icon={item.icon}
                type={item.type}
                color={item.color}
                disabled={item.disabled}
                description={item.fields.map((n) => n.name).join(', ')}
              />
            )
          })
        )}
      </div>
    </div>
  )
})
