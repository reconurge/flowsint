"use client"

import { cn } from "@/lib/utils"
import { Users, TimerIcon, MapIcon, WaypointsIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import MoreMenu from "./more-menu"
import { ScanButton } from "./scans-drawer/scan-button"


export function InvestigationtNavigation({ project_id, investigation_id }: { project_id: string, investigation_id: string }) {
    const pathname = usePathname()
    const sections = [
        {
            id: "sketch",
            name: "Sketch",
            href: `/dashboard/projects/${project_id}/investigations/${investigation_id}`,
            icon: WaypointsIcon
        },
        {
            id: "individuals",
            name: "Individuals",
            href: `/dashboard/projects/${project_id}/investigations/${investigation_id}/individuals`,
            icon: Users,
        },
        {
            id: "timeline",
            name: "Timeline",
            href: `/dashboard/projects/${project_id}/investigations/${investigation_id}/timeline`,
            icon: TimerIcon,
        },
        {
            id: "map",
            name: "Map",
            href: `/dashboard/projects/${project_id}/investigations/${investigation_id}/map`,
            icon: MapIcon,
        },
    ]

    return (
        <div className="flex items-center justify-between">
            <div className="flex overflow-auto">
                {sections.map((section) => (
                    <Link
                        key={section.id}
                        href={section?.href || ""}
                        className={cn(
                            "flex items-center text-sm gap-2 px-4 py-2 transition-colors",
                            section?.href == pathname
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                        )}
                    >
                        <section.icon className="h-4 w-4" />
                        <span>{section.name}</span>
                        {/* {section?.count && (
                        <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">{section.count}</span>
                    )} */}
                    </Link>
                ))}
            </div>
            <div className="flex items-center">
                <MoreMenu />
                <ScanButton />
            </div>
        </div>
    )
}

