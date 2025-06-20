import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { Command } from "../command"
import { NavUser } from "../nav-user"
import { Link, useParams } from "@tanstack/react-router"
import InvestigationSelector from "./investigation-selector"
import SketchSelector from "./sketch-selector"

export function TopNavbar() {
    const { investigationId, id } = useParams({ strict: false })
    return (
        <header className="flex items-center bg-card h-12 px-4 border-b shrink-0">
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
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5 opacity-60" />
                </Button>
                <NavUser />
            </div>
        </header>
    )
}
