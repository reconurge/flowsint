import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Bell, ChevronDown, Settings, User } from "lucide-react"
import { Command } from "../command"

export function TopNavbar() {
    return (
        <header className="flex items-center bg-card h-12 px-4 border-b shrink-0">
            <div className="flex items-center gap-4">
                <span className="text-lg font-semibold">Flowsint</span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-1 px-2">
                            Workspaces <ChevronDown className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem>My Workspace</DropdownMenuItem>
                        <DropdownMenuItem>Team Workspace</DropdownMenuItem>
                        <DropdownMenuItem>Create Workspace</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" className="px-2">
                    API Network
                </Button>
            </div>
            <div className="grow flex items-center justify-center">
                <Command />
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                    <Bell className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                </Button>
            </div>
        </header>
    )
}
