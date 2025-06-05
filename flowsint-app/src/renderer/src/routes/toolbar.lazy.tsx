import TabBar from '@/components/tab-bar'
import { useToolbarInitialization } from '@/hooks/use-toolbar-initialization'
import { createLazyFileRoute } from '@tanstack/react-router'
export const Route = createLazyFileRoute('/toolbar')({
  component: Toolbar
})

// warning: any child of this component cannot use anything outside of the tab-slice state.
function Toolbar() {
  const isInitialized = useToolbarInitialization()

  const PlatformToolbar = () => {
    return (
      <div className="flex flex-row items-start w-full overflow-hidden bg-stone-800">
        <div className="pl-[0px] w-full h-full">{isInitialized && <TabBar />}</div>
      </div>
    )
  }

  // Add 'titlebar-button' class to prevent window dragging on toolbar.
  return (
    <div className="h-svh w-full flex flex-row titlebar bg-border justify-end">
      <PlatformToolbar />
    </div>
  )
}
