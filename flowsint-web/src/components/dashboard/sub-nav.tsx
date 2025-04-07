"use client"

import { cn } from "@/lib/utils"
import { Eye, Users, Camera, Database, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"


export function SubNav() {
    const pathname = usePathname()
    const sections = [
        {
            id: "overview",
            name: "Overview",
            href: "/dashboard",
            icon: Eye,
            count: 18,
        },
        {
            id: "investigations",
            name: "Investigations",
            href: "/dashboard/investigations",
            icon: Users,
            count: 24,
        },
        {
            id: "surveillance",
            name: "Surveillance",
            href: "/dashboard/surveillance",
            icon: Camera,
            count: 6,
        },
        {
            id: "intelligence",
            name: "Intelligence",
            href: "/dashboard/intelligence",
            icon: Database,
            count: 16,
        },
        {
            id: "configurations",
            name: "Configurations",
            href: "/dashboard/settings",
            icon: Settings,
            count: null,
        },
    ]

    return (
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
                    {/* {section.count !== null && (
                        <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">{section.count}</span>
                    )} */}
                </Link>
            ))}
        </div>
    )
}

