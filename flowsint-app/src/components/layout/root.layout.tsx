import { type ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { TopNavbar } from "./top-navbar"
import { StatusBar } from "./status-bar"

interface LayoutProps {
    children: ReactNode
}

export default function RootLayout({ children }: LayoutProps) {

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden">
            <TopNavbar />
            <div className="flex grow overflow-hidden">
                <Sidebar />
                <div className="flex bg-background flex-col w-full h-full grow">
                    {children}
                </div>
            </div>
            <div>
                <StatusBar />
            </div>
        </div>
    )
}