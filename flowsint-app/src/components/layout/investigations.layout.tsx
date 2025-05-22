import { type ReactNode } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import InvestigationList from "../investigations/investigation-list"

interface LayoutProps {
    children: ReactNode
}

export default function InvestigationsLayout({ children }: LayoutProps) {

    return (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={18} minSize={15} maxSize={40}>
                <InvestigationList />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={75}>
                {children}
            </ResizablePanel>
        </ResizablePanelGroup>
    )
}