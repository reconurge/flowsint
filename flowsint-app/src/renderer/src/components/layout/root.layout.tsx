import { type ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { TopNavbar } from "./top-navbar"
import { StatusBar } from "./status-bar"
import SecondaryNavigation from "./secondary-navigation"
import { ConfirmContextProvider } from "@/components/use-confirm-dialog"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/resizable"
import { LogPanel } from "./log-panel"
import { useConsoleStore } from "@/stores/console-store"

interface LayoutProps {
    children: ReactNode
}

export default function RootLayout({ children }: LayoutProps) {
    const { isOpen } = useConsoleStore()

    return (
        <ConfirmContextProvider>
            <div className="flex flex-col h-screen w-screen overflow-hidden">
                {/* Top navbar */}
                <TopNavbar />

                {/* Main layout */}
                <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
                    {/* Main content area with optional console */}
                    <ResizablePanel order={1} defaultSize={isOpen ? 70 : 100} minSize={30}>
                        <ResizablePanelGroup
                            direction="vertical"
                            className="h-full"
                        >
                            {/* Main content */}
                            <ResizablePanel defaultSize={100} minSize={30}>
                                <ResizablePanelGroup
                                    direction="horizontal"
                                    className="h-full"
                                >
                                    <Sidebar />

                                    {/* Secondary Navigation panel */}
                                    <ResizablePanel
                                        defaultSize={20}
                                        minSize={16}
                                        collapsible={true}
                                        collapsedSize={0}
                                    >
                                        {/* <div className="h-10 bg-card flex items-center justify-end px-2 text-sm w-full font-semibold border-b">
                                            <Button disabled className="h-7 !bg-muted" variant={"outline"}>Import</Button>
                                        </div> */}
                                        <div className="h-full flex flex-col overflow-hidden bg-card">
                                            <SecondaryNavigation />
                                        </div>
                                    </ResizablePanel>

                                    <ResizableHandle withHandle />
                                    <ResizablePanel className="h-full w-full">
                                        {children}
                                    </ResizablePanel>
                                </ResizablePanelGroup>
                            </ResizablePanel>

                            {/* Status bar */}
                            <div className="h-8 shrink-0">
                                <StatusBar />
                            </div>

                            {/* Console panel - only shown when isOpen is true */}
                            {isOpen && (
                                <>
                                    <ResizableHandle />
                                    <ResizablePanel
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
