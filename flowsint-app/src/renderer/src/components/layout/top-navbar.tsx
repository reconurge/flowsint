import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { Command } from "../command"
import { NavUser } from "../nav-user"
import { Link, useParams } from "@tanstack/react-router"
import InvestigationSelector from "./investigation-selector"
import SketchSelector from "./sketch-selector"
import { useEffect, useState } from "react"

export function TopNavbar() {
    const { investigationId, id } = useParams({ strict: false })
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => {
        const checkWindowState = async () => {
            try {
                const windowState = await window.api.getWindowState()
                setIsFullscreen(windowState.isFullscreen)
            } catch (error) {
                console.error('Failed to get window state:', error)
                setIsFullscreen(false)
            }
        }
        checkWindowState()
        const handleResize = () => {
            setTimeout(checkWindowState, 100)
        }
        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return (
        <header className={`flex items-center bg-card h-12 border-b shrink-0 ${isFullscreen ? 'px-4' : 'pl-20 pr-4'} -webkit-app-region-drag`}>
            <div className="flex items-center gap-4">
                <Link to="/dashboard" className="flex items-center gap-2">
                    <img src="/icon.png" alt="Flowsint" className="h-8 w-8" />
                    <span className="text-lg font-semibold">Flowsint</span>
                </Link>
                <div className="hidden lg:flex items-center gap-2">
                    {investigationId &&
                        <InvestigationSelector />}
                    {id && <>
                        <span className="opacity-30 text-sm">/</span><SketchSelector />
                    </>}
                </div>
            </div>
            <div className="grow flex items-center justify-center">
                <Command />
            </div>
            <div className="flex items-center gap-2 -webkit-app-region-no-drag">
                <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5 opacity-60" />
                </Button>
                <NavUser />
            </div>
        </header>
    )
}
