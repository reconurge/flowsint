import { type ReactNode } from "react"
import { Toolbar } from "../sketches/toolbar"

interface LayoutProps {
    children: ReactNode
}

export default function SketchLayout({ children }: LayoutProps) {

    return (
        <div className="flex grow w-full h-full">
            <div className="h-full w-full">
                {children}
            </div>
            <div className="w-12 h-full border-l p-2">
                <Toolbar />
            </div>
        </div>
    )
}