import { useElectronTabs } from '@/hooks/use-electron-tabs'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TabBar() {
  const { tabInfos, selectedTab, closeTab, closeAllTabs, selectTab, reorderTabs } = useElectronTabs()

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', id.toString())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    const sourceId = parseInt(e.dataTransfer.getData('text/plain'))
    if (sourceId === targetId) return

    const newOrder = tabInfos.map(tab => tab.id)
    const sourceIndex = newOrder.indexOf(sourceId)
    const targetIndex = newOrder.indexOf(targetId)
    newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, sourceId)
    reorderTabs(newOrder)
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-background border-b">
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {tabInfos.map((tab) => (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer select-none',
              selectedTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            )}
            onClick={() => selectTab(tab.id)}
          >
            <span>{tab.title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={closeAllTabs}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
} 