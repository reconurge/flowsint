"use client"

import { cn } from "@/lib/utils"
import { Users, TimerIcon, MapIcon, WaypointsIcon } from 'lucide-react'
import Link from "next/link"
import { usePathname } from "next/navigation"
import { memo, useMemo } from "react"
import MoreMenu from "./more-menu"
import { ScanButton } from "./scans-drawer/scan-button"

function InvestigationNavigation({ project_id, investigation_id }: { project_id: string, investigation_id: string }) {
    const pathname = usePathname()

    // Memoize the sections array so it doesn't get recreated on every render
    const sections = useMemo(() => [
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
    ], [project_id, investigation_id]);

    return (
        <div className="flex items-center justify-between w-full">
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

// Memoize the entire component
export const MemoizedInvestigationNavigation = memo(InvestigationNavigation);

// For backward compatibility, you can also export the original name
export { MemoizedInvestigationNavigation as InvestigationtNavigation };