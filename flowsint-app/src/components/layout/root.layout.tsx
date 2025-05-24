import { type ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { TopNavbar } from "./top-navbar"
import { StatusBar } from "./status-bar"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../ui/resizable"
import { GraphTabs } from "./tabs"
import SecondaryNavigation from "./secondary-navigation"

interface LayoutProps {
    children: ReactNode
}

export default function RootLayout({ children }: LayoutProps) {

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden">
            <TopNavbar />
            <div className="flex grow overflow-hidden">
                <Sidebar />
                <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
                    <ResizablePanel defaultSize={18} minSize={15} maxSize={40} className="h-full">
                        <SecondaryNavigation />
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={75}>
                        <GraphTabs />
                        {children}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
            <div>
                <StatusBar />
            </div>
        </div>
    )
}