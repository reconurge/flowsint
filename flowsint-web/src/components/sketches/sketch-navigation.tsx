"use client"

import { cn } from "@/lib/utils"
import { Users, TimerIcon, MapIcon, WaypointsIcon, TablePropertiesIcon } from 'lucide-react'
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment, memo, useMemo } from "react"
import MoreMenu from "./more-menu"
import { ScanButton } from "./scans-drawer/scan-button"
import { Badge } from "../ui/badge"
import { DownloadButton } from "../download-button"
import { AvatarList } from "../avatar-list"
import { Sketch } from "@/types/sketch"
import { Profile } from "@/types"

function SketchNavigation({ investigation_id, sketch_id, sketch, user_id }: { investigation_id: string, sketch_id: string, sketch: Sketch, user_id: string }) {
    const pathname = usePathname()

    // Memoize the sections array so it doesn't get recreated on every render
    const sections = useMemo(() => [
        {
            id: "sketch",
            name: "Sketch",
            href: `/dashboard/investigations/${investigation_id}/sketches/${sketch_id}`,
            icon: WaypointsIcon
        },
        {
            id: "table",
            name: "Table",
            href: `/dashboard/investigations/${investigation_id}/sketches/${sketch_id}/table`,
            icon: TablePropertiesIcon,
        },
        {
            id: "map",
            name: "Map",
            href: `/dashboard/investigations/${investigation_id}/sketches/${sketch_id}/map`,
            icon: MapIcon,
            disabled: true,
        },
        {
            id: "timeline",
            name: "Timeline",
            href: `/dashboard/investigations/${investigation_id}/sketches/${sketch_id}/timeline`,
            icon: TimerIcon,
            disabled: true,
        }
    ], [investigation_id, sketch_id]);

    return (
        <div className="flex items-center justify-between w-full">
            <div className="flex overflow-auto">
                {sections.map((section) => (
                    <Fragment key={section.id}>
                        {section.disabled ?
                            <span
                                className="text-muted-foreground border-b-2 border-transparent opacity-40 text-sm px-4 py-2.5 flex items-center gap-2">
                                <section.icon className="h-4 w-4" />
                                <span>{section.name}</span>
                                <Badge variant={"outline"}>Soon</Badge>
                            </span> :
                            <Link
                                href={section?.href || ""}
                                className={cn(
                                    "flex items-center text-sm gap-2 border-b-2  border-transparent px-4 py-2 transition-colors",
                                    section?.href == pathname
                                        ? "bg-background text-accent-foreground border-b-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                                )}
                            >
                                <section.icon className="h-4 w-4" />
                                <span>{section.name}</span>
                            </Link>}
                    </Fragment>
                ))}
            </div>
            <div className="flex items-center ">
                <div className="px-2">
                    <AvatarList size="md" users={sketch?.members?.map(({ profile }: { profile: Profile }) => ({ ...profile, owner: profile.id === sketch.owner_id })) || []} />
                </div>
                <DownloadButton endpoint={`/api/investigations/${investigation_id}/sketches/${sketch_id}/table`} name={investigation_id} />
                <MoreMenu sketch={sketch} user_id={user_id} />
                <ScanButton />
            </div>
        </div >
    )
}

export const MemoizedInvestigationNavigation = memo(SketchNavigation);

export { MemoizedInvestigationNavigation as SketchNavigation };