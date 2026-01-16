import { type ReactNode, useMemo } from 'react'
import { Sidebar } from './sidebar'
import { TopNavbar } from './top-navbar'
import SecondaryNavigation from './secondary-navigation'
import { ConfirmContextProvider } from '@/components/use-confirm-dialog'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable'
import { PersistentLogPanel } from './persistent-log-panel'
import { useLayoutStore } from '@/stores/layout-store'
import NotesPanel from '../analyses/notes-panel'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { useParams } from '@tanstack/react-router'
import DetailsPanel from '../sketches/details-panel/details-panel'
import EdgeDetailsPanel from '../sketches/details-panel/edge-details-panel'
import { useGraphStore } from '@/stores/graph-store'

interface LayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: LayoutProps) {
  const isOpenConsole = useLayoutStore((s) => s.isOpenConsole)
  const toggleConsole = useLayoutStore((s) => s.toggleConsole)
  const isOpenPanel = useLayoutStore((s) => s.isOpenPanel)
  const isOpenAnalysis = useLayoutStore((s) => s.isOpenAnalysis)
  const isOpenDetails = useLayoutStore((s) => s.isOpenDetails)
  const toggleAnalysis = useLayoutStore((s) => s.toggleAnalysis)
  const togglePanel = useLayoutStore((s) => s.togglePanel)
  const closePanel = useLayoutStore((s) => s.closePanel)
  const openPanel = useLayoutStore((s) => s.openPanel)
  const closeDetails = useLayoutStore((s) => s.closeDetails)
  const currentNode = useGraphStore((s) => s.getCurrentNode())
  const currentEdge = useGraphStore((s) => s.getCurrentEdge())
  const { id, type } = useParams({ strict: false })

  // Set up keyboard shortcut for chat panel
  useKeyboardShortcut({
    key: 'l',
    ctrlOrCmd: true,
    callback: toggleAnalysis
  })
  useKeyboardShortcut({
    key: 'b',
    ctrlOrCmd: true,
    callback: togglePanel
  })
  useKeyboardShortcut({
    key: 'd',
    ctrlOrCmd: true,
    callback: toggleConsole
  })

  // Memoize the details panel section to prevent unnecessary re-renders
  const detailsPanelSection = useMemo(() => {
    if (!id || type != 'graph') return null

    // Priority 1: NotesPanel if isOpenAnalysis is true
    if (isOpenAnalysis) {
      return (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="details-panel"
            order={4}
            defaultSize={20}
            minSize={16}
            maxSize={40}
            onCollapse={closeDetails}
            onExpand={() => { }} // No auto-open here
            collapsible={true}
            collapsedSize={2}
          >
            <NotesPanel />
          </ResizablePanel>
        </>
      )
    }

    // Priority 2: Show DetailsPanel and/or EdgeDetailsPanel when currentNode/currentEdge exist
    const hasNode = !!currentNode
    const hasEdge = !!currentEdge

    if (hasNode || hasEdge) {
      return (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="details-panel"
            order={4}
            defaultSize={20}
            minSize={16}
            maxSize={40}
            onCollapse={closeDetails}
            onExpand={() => { }} // No auto-open here
            collapsible={true}
            collapsedSize={2}
          >
            {hasNode && hasEdge ? (
              // Both node and edge: show both in a vertical split
              <ResizablePanelGroup direction="vertical" className="h-full">
                <ResizablePanel defaultSize={70} minSize={30}>
                  <DetailsPanel />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={30} minSize={20}>
                  <EdgeDetailsPanel />
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : hasNode ? (
              // Only node
              <DetailsPanel />
            ) : (
              // Only edge
              <EdgeDetailsPanel />
            )}
          </ResizablePanel>
        </>
      )
    }

    // No panel should be shown
    return null
  }, [id, currentNode?.id, currentNode?.data, currentEdge?.id, isOpenAnalysis, closeDetails])

  // Memoize the entire layout content to prevent unnecessary re-renders
  const layoutContent = useMemo(
    () => (
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        {/* Top navbar */}
        <TopNavbar />
        {/* Main layout */}
        <div className="flex grow">
          <Sidebar />
          <ResizablePanelGroup
            autoSaveId="conditional"
            direction="vertical"
            className="flex-1 min-h-0"
          >
            {/* Main content area with optional console */}
            <ResizablePanel order={1} id="main" defaultSize={isOpenConsole ? 70 : 100} minSize={30}>
              <ResizablePanelGroup
                autoSaveId="conditional2"
                direction="vertical"
                className="h-full"
              >
                {/* Main content */}
                <ResizablePanel id="content" order={1} defaultSize={100} minSize={30}>
                  <ResizablePanelGroup
                    direction="horizontal"
                    autoSaveId="conditional3"
                    className="h-full"
                  >
                    {isOpenPanel && (
                      <>
                        <ResizablePanel
                          id="sidebar"
                          className="min-w-64"
                          order={2}
                          defaultSize={20}
                          minSize={16}
                          maxSize={30}
                          onCollapse={closePanel}
                          onExpand={openPanel}
                          collapsible={true}
                          collapsedSize={0}
                        >
                          <div className="h-full flex flex-col overflow-hidden bg-card">
                            <SecondaryNavigation />
                          </div>
                        </ResizablePanel>
                        <ResizableHandle />
                      </>
                    )}
                    <ResizablePanel className="h-full w-full" id="children" order={3}>
                      <>{children}</>
                    </ResizablePanel>
                    {detailsPanelSection}
                  </ResizablePanelGroup>
                </ResizablePanel>

                {/* Console panel with status bar - uses PersistentLogPanel to maintain state */}
                <PersistentLogPanel />
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    ),
    [
      isOpenConsole,
      isOpenPanel,
      isOpenAnalysis,
      isOpenDetails,
      id,
      children,
      detailsPanelSection,
      closePanel,
      openPanel,
      closeDetails
    ]
  )

  return <ConfirmContextProvider>{layoutContent}</ConfirmContextProvider>
}
