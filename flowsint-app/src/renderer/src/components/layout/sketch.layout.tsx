import { type ReactNode } from "react"
import { Toolbar } from "../sketches/toolbar"

interface LayoutProps {
    children: ReactNode
}

export default function SketchLayout({ children }: LayoutProps) {

    return (
        <div className="flex h-full w-full">
            <div className="h-full w-full">
                {children}
            </div>
            <div className="w-12 h-full border-l !overflow-y-auto p-2">
                <Toolbar />
            </div>
        </div>
    )
}