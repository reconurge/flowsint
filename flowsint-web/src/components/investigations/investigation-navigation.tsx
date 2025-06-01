"use client"

import { cn } from "@/lib/utils"
import { Eye, Users, Camera, Settings, Waypoints } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

interface InvestigationNavigationProps {
    investigation_id: string
    currentTab: string
}

export function InvestigationNavigation({ investigation_id, currentTab }: InvestigationNavigationProps) {
    const router = useRouter()
    const pathname = usePathname()

    const sections = [
        {
            id: "overview",
            name: "Overview",
            href: `/dashboard/investigations/${investigation_id}?tab=overview`,
            icon: Eye,
        },
        {
            id: "sketches",
            name: "Sketches",
            href: `/dashboard/investigations/${investigation_id}?tab=sketches`,
            icon: Waypoints,
        },
        {
            id: "documents",
            name: "Documents",
            href: `/dashboard/investigations/${investigation_id}?tab=documents`,
            icon: Camera,
        },
        {
            id: "configurations",
            name: "Configurations",
            href: `/dashboard/investigations/${investigation_id}?tab=configurations`,
            icon: Settings,
        },
    ]

    return (
        <div className="flex overflow-auto">
            {sections.map((section) => (
                <Link
                    key={section.id}
                    href={section.href}
                    className={cn(
                        "flex items-center text-sm gap-2 px-4 py-2 transition-colors",
                        section.id === currentTab
                            ? "bg-background text-accent-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                    )}
                >
                    <section.icon className="h-4 w-4" />
                    <span>{section.name}</span>
                    {/* {section.count !== null && (
                        <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">{section.count}</span>
                    )} */}
                </Link>
            ))}
        </div>
    )
}

