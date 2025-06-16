import { type ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { TopNavbar } from "./top-navbar"
import { StatusBar } from "./status-bar"
import SecondaryNavigation from "./secondary-navigation"
import { ConfirmContextProvider } from "@/components/use-confirm-dialog"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/resizable"
import { LogPanel } from "./log-panel"
import { useLayoutStore } from "@/stores/layout-store"
import { PathBreadcrumb } from "./breadcrumb"
import NotesPanel from "../analyses/notes-panel"
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut"
import { useParams } from "@tanstack/react-router"

interface LayoutProps {
    children: ReactNode
}

export default function RootLayout({ children }: LayoutProps) {
    const isOpenConsole = useLayoutStore(s => s.isOpenConsole)
    const toggleConsole = useLayoutStore(s => s.toggleConsole)
    const isOpenPanel = useLayoutStore(s => s.isOpenPanel)
    const isOpenChat = useLayoutStore(s => s.isOpenChat)
    const togglePanel = useLayoutStore(s => s.togglePanel)
    const closePanel = useLayoutStore(s => s.closePanel)
    const openPanel = useLayoutStore(s => s.openPanel)
    const toggleChat = useLayoutStore(s => s.toggleChat)
    const closeChat = useLayoutStore(s => s.closeChat)
    const openChat = useLayoutStore(s => s.openChat)
    const { investigationId, type, id } = useParams({ strict: false })

    // Set up keyboard shortcut for chat panel
    useKeyboardShortcut({
        key: "l",
        ctrlOrCmd: true,
        callback: toggleChat
    })
    useKeyboardShortcut({
        key: "b",
        ctrlOrCmd: true,
        callback: togglePanel
    })
    useKeyboardShortcut({
        key: "d",
        ctrlOrCmd: true,
        callback: toggleConsole
    })

    return (
        <ConfirmContextProvider>
            <div className="flex flex-col h-screen w-screen overflow-hidden">
                {/* Top navbar */}
                <TopNavbar />
                {/* Main layout */}
                <ResizablePanelGroup autoSaveId="conditional" direction="vertical" className="flex-1 min-h-0">
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
                                    <Sidebar />
                                    {isOpenPanel && (
                                        <>
                                            <ResizablePanel
                                                id="sidebar"
                                                order={2}
                                                defaultSize={20}
                                                minSize={16}
                                                maxSize={30}
                                                onCollapse={closePanel}
                                                onExpand={openPanel}
                                                collapsible={true}
                                                collapsedSize={0}
                                            >
                                                <div className="h-10 bg-card flex items-center justify-end px-2 text-sm w-full font-semibold border-b">
                                                    <PathBreadcrumb />
                                                </div>
                                                <div className="h-[calc(100%-40px)] flex flex-col overflow-hidden bg-card">
                                                    <SecondaryNavigation />
                                                </div>
                                            </ResizablePanel>
                                            <ResizableHandle withHandle />
                                        </>
                                    )}
                                    <ResizablePanel className="h-full w-full" id="children" order={3}>
                                        {children}
                                    </ResizablePanel>
                                    {isOpenChat && type !== "analysis" && investigationId && (
                                        <>
                                            <ResizableHandle withHandle />
                                            <ResizablePanel
                                                id="notes"
                                                order={4}
                                                defaultSize={20}
                                                minSize={16}
                                                maxSize={40}
                                                onCollapse={closeChat}
                                                onExpand={openChat}
                                                collapsible={true}
                                                collapsedSize={2}
                                            >
                                                <NotesPanel />
                                            </ResizablePanel>
                                        </>
                                    )}
                                </ResizablePanelGroup>
                            </ResizablePanel>

                            {/* Status bar */}
                            <div className="h-8 shrink-0">
                                <StatusBar />
                            </div>

                            {/* Console panel - only shown when isOpen is true */}
                            {isOpenConsole && id && (
                                <>
                                    <ResizableHandle />
                                    <ResizablePanel
                                        id="console"
                                        order={5}
                                        defaultSize={30}
                                        minSize={20}
                                        maxSize={50}
                                    >
                                        <div className="h-full overflow-hidden">
                                            <LogPanel />
                                        </div>
                                    </ResizablePanel>
                                </>
                            )}
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </ConfirmContextProvider>
    )
}

