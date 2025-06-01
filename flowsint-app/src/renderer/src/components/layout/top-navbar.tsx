import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { Command } from "../command"
import { NavUser } from "../nav-user"
import { Link } from "@tanstack/react-router"

export function TopNavbar() {
    return (
        <header className="flex items-center bg-card h-12 px-4 border-b shrink-0">
            <div className="flex items-center gap-4">
                <span className="text-lg font-semibold">Flowsint</span>
                <Link to="/dashboard/tools">
                    <Button variant="ghost" className="px-2">
                        Tools
                    </Button>
                </Link>
            </div>
            <div className="grow flex items-center justify-center">
                <Command />
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5 opacity-60" />
                </Button>
                <NavUser />
            </div>
        </header>
    )
}
