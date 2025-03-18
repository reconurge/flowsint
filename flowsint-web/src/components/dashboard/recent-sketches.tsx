"use client"

import type { Investigation } from "@/types/investigation"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { FileText, Folder, Layers, Search, Waypoints } from "lucide-react"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"

const RecentSketches = () => {
    const {
        data: investigations,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["dashboard", "investigations"],
        queryFn: async () => {
            const res = await fetch(`/api/investigations`)
            return res.json()
        },
        refetchOnWindowFocus: true,
    })

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed">
                <Search className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold">Error loading investigations</h3>
                <p className="text-sm text-muted-foreground">
                    There was a problem loading your investigations. Please try again.
                </p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden shadow-none bg-transparent border-none">
                        <Skeleton className="h-40 w-full bg-foreground/5" />
                        <CardContent className="p-4">
                            <Skeleton className="h-4 w-3/4 mb-2 bg-foreground/5" />
                            <Skeleton className="h-3 w-1/2 bg-foreground/5" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    // SVG placeholder icons to use randomly
    const placeholderIcons = [
        <Waypoints key="folder" strokeWidth={.60} className="h-18 w-18 opacity-40 group-hover:opacity-100 group-hover:text-primary" />,
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {investigations?.map((investigation: Investigation) => {
                const randomIcon = placeholderIcons[Math.floor(Math.random() * placeholderIcons.length)]

                return (
                    <Link href={`/investigations/${investigation.id}`} key={investigation.id} className="group">
                        <Card className="bg-transparent shadow-none h-full transition-all duration-200 border-none">
                            <div className={`flex items-center justify-center bg-foreground/5 h-40 border group-hover:border-primary/80 group-hover:border-2 rounded-md`}>
                                <div className="transform transition-transform group-hover:scale-105">{randomIcon}</div>
                            </div>
                            <CardContent className="p-4 relative">
                                <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                                    {investigation.title}
                                </h3>
                                <span className="text-xs opacity-60">Last updated {formatDistanceToNow(investigation.last_updated_at, { addSuffix: true })}</span>
                            </CardContent>
                        </Card>
                    </Link>
                )
            })}
        </div>
    )
}

export default RecentSketches

