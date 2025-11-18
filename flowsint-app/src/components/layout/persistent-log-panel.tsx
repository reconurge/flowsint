import { useLayoutStore } from '@/stores/layout-store'
import { useParams } from '@tanstack/react-router'
import { LogPanel } from './log-panel'
import { StatusBar } from './status-bar'
import { ResizableHandle, ResizablePanel } from '../ui/resizable'
import { useMemo } from 'react'

/**
 * Wrapper component that keeps LogPanel mounted even when console is closed
 * to preserve terminal state. Uses a stable key to ensure React reuses the
 * same instance.
 */
export const PersistentLogPanel = () => {
  const isOpenConsole = useLayoutStore((s) => s.isOpenConsole)
  const { id } = useParams({ strict: false })

  // Create a memoized LogPanel that persists across re-renders
  // This ensures the same instance is used whether console is open or closed
  const logPanel = useMemo(() => {
    if (!id) return null
    return <LogPanel key={`persistent-log-panel-${id}`} />
  }, [id])

  // Don't render anything if there's no id
  if (!id) {
    return (
      <div className="h-8 shrink-0 border-t">
        <StatusBar />
      </div>
    )
  }

  return (
    <>
      {isOpenConsole ? (
        <>
          <ResizableHandle />
          <ResizablePanel
            id="console"
            order={5}
            defaultSize={30}
            minSize={10}
            maxSize={50}
          >
            <div className="h-full overflow-hidden flex flex-col">
              <div className="h-8 shrink-0">
                <StatusBar />
              </div>
              <div className="flex-1 overflow-hidden">
                {/* Show LogPanel when console is open */}
                {logPanel}
              </div>
            </div>
          </ResizablePanel>
        </>
      ) : (
        <div className="h-8 shrink-0 border-t">
          <StatusBar />
          {/* Keep LogPanel mounted but hidden when console is closed */}
          <div
            style={{
              position: 'absolute',
              left: '-9999px',
              top: '-9999px',
              width: '500px',
              height: '500px',
              pointerEvents: 'none',
              visibility: 'hidden',
              overflow: 'hidden'
            }}
          >
            {/* Same LogPanel instance rendered off-screen */}
            {logPanel}
          </div>
        </div>
      )}
    </>
  )
}
