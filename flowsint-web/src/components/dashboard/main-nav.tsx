"use client"
import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import InvestigationSelector from "../investigations/investigation-selector"
import CaseSelector from "../sketches/sketch-selector"
import { useParams, usePathname } from "next/navigation"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
    const { sketch_id, investigation_id } = useParams()
    const pathname = usePathname()

    const isActive = (path: string) => {
        if (path === "/dashboard") {
            return pathname === "/dashboard"
        }
        return pathname.startsWith(path)
    }

    if (investigation_id)
        return (
            <div className="flex gap-1 items-center p-2">
                <InvestigationSelector />
                {sketch_id && (
                    <>
                        <span className="opacity-60 text-sm">/</span>
                        <CaseSelector />
                    </>
                )}
            </div>
        )

    return (
        <nav className={cn("md:flex hidden w-full items-center space-x-4 lg:space-x-6", className)} {...props}>
            <Link
                href="/dashboard"
                className={cn(
                    "text-sm font-medium transition-colors hover:text-primary px-3 py-1.5 rounded-md",
                    isActive("/dashboard") ? "bg-muted/50" : "text-muted-foreground",
                )}
            >
                Dashboard
            </Link>
            <Link
                href="/dashboard/tools"
                className={cn(
                    "text-sm font-medium transition-colors hover:text-primary px-3 py-1.5 rounded-md",
                    isActive("/dashboard/tools") ? "bg-muted/50" : "text-muted-foreground",
                )}
            >
                Tools
            </Link>
            <Link
                href="/dashboard/analysis"
                className={cn(
                    "text-sm font-medium transition-colors hover:text-primary px-3 py-1.5 rounded-md",
                    isActive("/dashboard/analysis") ? "bg-muted/50" : "text-muted-foreground",
                )}
            >
                Analyses
            </Link>
            <Link
                href="/dashboard/transforms"
                className={cn(
                    "text-sm font-medium transition-colors hover:text-primary px-3 py-1.5 rounded-md",
                    isActive("/dashboard/transforms") ? "bg-muted/50" : "text-muted-foreground",
                )}
            >
                Transforms
            </Link>
        </nav>
    )
}
