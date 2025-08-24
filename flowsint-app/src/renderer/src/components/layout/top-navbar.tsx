import { Command } from "../command"
import { NavUser } from "../nav-user"
import { Link, useParams } from "@tanstack/react-router"
import InvestigationSelector from "./investigation-selector"
import SketchSelector from "./sketch-selector"
import { useEffect, useState, memo, useCallback } from "react"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { useLayoutStore } from "@/stores/layout-store"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Ellipsis } from "lucide-react"
import { isMac } from "@/lib/utils"

export const TopNavbar = memo(() => {
    const { investigationId, id, type } = useParams({ strict: false })
    const [isFullscreen, setIsFullscreen] = useState(false)
    const toggleAnalysis = useLayoutStore(s => s.toggleAnalysis)
    const isOpenAnalysis = useLayoutStore(s => s.isOpenAnalysis)

    const handleToggleAnalysis = useCallback(() => toggleAnalysis(), [toggleAnalysis])

    useEffect(() => {
        const checkWindowState = async () => {
            try {
                const windowState = await window.api.getWindowState()
                setIsFullscreen(windowState.isFullscreen)
            } catch (error) {
                console.error('Failed to get window state:', error)
                setIsFullscreen(true)
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
            <div className="flex items-center gap-4 -webkit-app-region-no-drag">
                <div className="flex items-center space-x-2">
                    {type === "graph" &&
                        <>
                            <Switch checked={isOpenAnalysis} onCheckedChange={handleToggleAnalysis} id="notes" />
                            <Label htmlFor="notes">Toggle notes<span className="text-[.7rem] -ml-1 opacity-60">({isMac ? '⌘' : 'ctrl'}L)</span></Label>
                        </>
                    }
                </div>
                <InvestigationMenu />
                <NavUser />
            </div>
        </header>
    )
})


export function InvestigationMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div>
                    <Button size="icon" variant="ghost"><Ellipsis /></Button>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        General
                        <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Preferences
                        <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Keyboard shortcuts
                        <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>Team</DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem>Email</DropdownMenuItem>
                                <DropdownMenuItem>Message</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>More...</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuItem>
                        New Team
                        <DropdownMenuShortcut>⌘T</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>GitHub</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuItem disabled>API</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                    Delete
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
