"use client"
import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import ProjectSelector from "../investigations/project-selector"
import CaseSelector from "../investigations/case-selector"
import { useParams } from "next/navigation"
import { Separator } from "../ui/separator"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
    const { investigation_id, project_id } = useParams()

    if (project_id) return (
        <div className='flex gap-1 items-center p-2'>
            <ProjectSelector />{investigation_id && <><span className='opacity-60'>/</span><CaseSelector /></>}
        </div >
    )

    return (
        <nav className={cn("md:flex hidden w-full items-center space-x-4 lg:space-x-6", className)} {...props}>
            <Link
                href="/"
                className="text-sm font-medium transition-colors hover:text-primary bg-muted/50 px-3 py-1.5 rounded-md"
            >
                Dashboard
            </Link>
            <Link
                href="/sources"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary px-3 py-1.5 rounded-md"
            >
                Sources
            </Link>
            <Link
                href="/analyses"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary px-3 py-1.5 rounded-md"
            >
                Analyses
            </Link>
            <Link
                href="/templates"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary px-3 py-1.5 rounded-md"
            >
                Templates
            </Link>
        </nav>
    )
}

