import {
    ChevronsRightIcon,
    Fingerprint,
    Home,
    type LucideIcon,
    Workflow
} from "lucide-react"
import { Link } from "@tanstack/react-router"
import { useLayoutStore } from "@/stores/layout-store"
import { Button } from "../ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip"

interface NavItem {
    icon: LucideIcon
    label: string
    href?: string
}

export function Sidebar() {
    const togglePanel = useLayoutStore(s => s.togglePanel)
    const isOpenPanel = useLayoutStore(s => s.isOpenPanel)

    const navItems: NavItem[] = [
        { icon: Home, label: "Dashboard", href: "/dashboard" },
        { icon: Fingerprint, label: "Cases", href: "/dashboard/investigations" },
        // { icon: BrickWall, label: "Walls", href: "/dashboard/investigations/wall" },
        { icon: Workflow, label: "Transforms", href: "/dashboard/transforms" },
    ]

    const commonClasses =
        "flex items-center justify-center h-14 w-full rounded-sm hover:bg-muted"

    return (
        <div className="w-16 border-r h-full flex flex-col shrink-0 bg-card">
            <div className="flex flex-col items-center gap-1 p-2">
                {navItems.map((item, index) => {
                    const IconComponent = item.icon
                    const content = (
                        <IconComponent key={index} strokeWidth={1.2} className="h-4 w-4 opacity-70" />
                    )
                    return item.href ? (
                        <TooltipProvider key={index}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        to={item.href}
                                        className={commonClasses}
                                        activeProps={{ className: `${commonClasses} bg-muted` }}
                                    >
                                        {content}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <TooltipProvider key={index}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className={commonClasses}>
                                        {content}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )
                })}
            </div>
            <div className="grow"></div>
            <div className="flex justify-center items-center p-3">
                <Button variant={"ghost"} onClick={togglePanel}>
                    <ChevronsRightIcon
                        className={`h-12 w-12 transition-transform duration-200 ${isOpenPanel ? 'rotate-180' : 'rotate-0'}`}
                    />
                </Button>
            </div>
        </div>
    )
}
