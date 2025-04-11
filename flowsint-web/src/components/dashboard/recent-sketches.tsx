"use client"

import type { Sketch } from "@/types/sketch"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Fingerprint, Search } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { AvatarList } from "../avatar-list"

const RecentSketches = () => {
    const {
        data: sketches,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["dashboard", "sketches"],
        queryFn: async () => {
            const res = await fetch(`/api/latest-sketches`)
            return res.json()
        },
        refetchOnWindowFocus: true,
    })

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed">
                <Search className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold">Error loading sketches.</h3>
                <p className="text-sm text-muted-foreground">
                    There was a problem loading your sketches. Please try again.
                </p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden rounded-md shadow-none border-none p-0">
                        <Skeleton className="h-32 w-full bg-foreground/10 p-4">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-12 w-12 rounded-full bg-foreground/5" />
                                <div className="p-4 grow">
                                    <Skeleton className="h-4 w-3/4 mb-2 bg-foreground/5" />
                                    <Skeleton className="h-3 w-1/2 bg-foreground/5" />
                                </div>
                            </div>
                        </Skeleton>
                    </Card>
                ))}
            </div>
        )
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sketches?.map((sketch: Sketch) => {
                return (
                    <Link href={`/dashboard/investigations/${sketch.investigation_id}/sketches/${sketch.id}`} key={sketch.id} className="group">
                        <Card className="bg-background shadow-xs h-full min-h-32 transition-all duration-200 hover:border-primary rounded-md">
                            <CardContent className="p-4 relative h-full flex flex-col justify-between">
                                <div className="flex flex items-center gap-2 w-full">
                                    <div>
                                        <Fingerprint className="h-8 w-8 text-muted-foreground opacity-60" />
                                    </div>
                                    <div className="w-full truncate">
                                        <h3 className="font-medium w-full truncate text-ellispsis transition-colors">
                                            {sketch?.investigation?.name}<span className="mx-1 opacity-40 text-sm">/</span>{sketch.title}
                                        </h3>
                                        <span className="text-xs opacity-60">Last updated {formatDistanceToNow(sketch.last_updated_at, { addSuffix: true })}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end">
                                    <AvatarList users={sketch?.members?.map(({ profile }: { profile: { first_name: string, last_name: string, id: string } }) => ({ id: profile.id, name: `${profile.first_name} ${profile.last_name}` })) || []} size="sm" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                )
            })}
        </div>
    )
}

export default RecentSketches

interface FlowchartDiagramProps {
    width?: number | string
    height?: number | string
    backgroundColor?: string
    lineColor?: string
    solidBoxColor?: string
    solidBoxBorderColor?: string
    dottedBoxColor?: string
    dottedBoxBorderColor?: string
    plusIconColor?: string
    circleColor?: string
    dotColor?: string
}

function FlowchartDiagram({
    backgroundColor = "var(--sidebar)",
    lineColor = "var(--border)",
    solidBoxColor = "var(--background)",
    solidBoxBorderColor = "var(--border)",
    dottedBoxColor = "var(--background)",
    dottedBoxBorderColor = "var(--primary)",
    plusIconColor = "var(--primary)",
    circleColor = "var(--border)",
    dotColor = "#cccccc",
}: FlowchartDiagramProps) {
    const patternId = "dotPattern"
    return (
        <div className={`w-full h-full`} style={{ position: "relative" }}>
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 800 500"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    backgroundColor,
                    // display: "block", // Important pour éviter l'espace blanc en dessous
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                }}
                preserveAspectRatio="xMidYMid meet"
            >
                {/* <defs>
                    <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1" fill={dotColor} />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#${patternId})`} /> */}
                {/* Top dotted box */}
                <rect
                    x="400"
                    y="70"
                    width="180"
                    height="60"
                    rx="10"
                    ry="10"
                    fill={dottedBoxColor}
                    stroke={dottedBoxBorderColor}
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    transform="translate(-90, 0)"
                />

                {/* Middle solid boxes */}
                <g>
                    <rect
                        x="100"
                        y="260"
                        width="170"
                        height="60"
                        rx="10"
                        ry="10"
                        fill={solidBoxColor}
                        stroke={solidBoxBorderColor}
                        strokeWidth="2"
                    />

                    <rect
                        x="315"
                        y="260"
                        width="170"
                        height="60"
                        rx="10"
                        ry="10"
                        fill={solidBoxColor}
                        stroke={solidBoxBorderColor}
                        strokeWidth="2"
                    />

                    <rect
                        x="530"
                        y="260"
                        width="170"
                        height="60"
                        rx="10"
                        ry="10"
                        fill={solidBoxColor}
                        stroke={solidBoxBorderColor}
                        strokeWidth="2"
                    />
                </g>

                {/* Bottom dotted boxes */}
                <rect
                    x="100"
                    y="390"
                    width="170"
                    height="60"
                    rx="10"
                    ry="10"
                    fill={dottedBoxColor}
                    stroke={dottedBoxBorderColor}
                    strokeWidth="2"
                    strokeDasharray="5,5"
                />

                <rect
                    x="315"
                    y="390"
                    width="170"
                    height="60"
                    rx="10"
                    ry="10"
                    fill={dottedBoxColor}
                    stroke={dottedBoxBorderColor}
                    strokeWidth="2"
                    strokeDasharray="5,5"
                />

                <rect
                    x="530"
                    y="390"
                    width="170"
                    height="60"
                    rx="10"
                    ry="10"
                    fill={dottedBoxColor}
                    stroke={dottedBoxBorderColor}
                    strokeWidth="2"
                    strokeDasharray="5,5"
                />

                {/* Connecting lines */}
                <line x1="400" y1="130" x2="400" y2="225" stroke={lineColor} strokeWidth="2" />
                <line x1="185" y1="225" x2="615" y2="225" stroke={lineColor} strokeWidth="2" />
                <line x1="185" y1="225" x2="185" y2="260" stroke={lineColor} strokeWidth="2" />
                <line x1="400" y1="225" x2="400" y2="260" stroke={lineColor} strokeWidth="2" />
                <line x1="615" y1="225" x2="615" y2="260" stroke={lineColor} strokeWidth="2" />

                <line x1="185" y1="320" x2="185" y2="390" stroke={lineColor} strokeWidth="2" />
                <line x1="400" y1="320" x2="400" y2="390" stroke={lineColor} strokeWidth="2" />
                <line x1="615" y1="320" x2="615" y2="390" stroke={lineColor} strokeWidth="2" />

                {/* Plus icons */}
                <circle cx="400" cy="225" r="12" fill="var(--foreground)" stroke={lineColor} strokeWidth="2" />
                <line x1="394" y1="225" x2="406" y2="225" stroke={lineColor} strokeWidth="2" />
                <line x1="400" y1="219" x2="400" y2="231" stroke={lineColor} strokeWidth="2" />

                <circle cx="185" cy="225" r="12" fill="var(--foreground)" stroke={lineColor} strokeWidth="2" />
                <line x1="179" y1="225" x2="191" y2="225" stroke={lineColor} strokeWidth="2" />
                <line x1="185" y1="219" x2="185" y2="231" stroke={lineColor} strokeWidth="2" />

                <circle cx="615" cy="225" r="12" fill="var(--foreground)" stroke={lineColor} strokeWidth="2" />
                <line x1="609" y1="225" x2="621" y2="225" stroke={lineColor} strokeWidth="2" />
                <line x1="615" y1="219" x2="615" y2="231" stroke={lineColor} strokeWidth="2" />

                {/* Bottom plus icons */}
                <circle cx="185" cy="420" r="15" fill={plusIconColor} />
                <line x1="177" y1="420" x2="193" y2="420" stroke={circleColor} strokeWidth="2" />
                <line x1="185" y1="412" x2="185" y2="428" stroke={circleColor} strokeWidth="2" />

                <circle cx="400" cy="420" r="15" fill={plusIconColor} />
                <line x1="392" y1="420" x2="408" y2="420" stroke={circleColor} strokeWidth="2" />
                <line x1="400" y1="412" x2="400" y2="428" stroke={circleColor} strokeWidth="2" />

                <circle cx="615" cy="420" r="15" fill={plusIconColor} />
                <line x1="607" y1="420" x2="623" y2="420" stroke={circleColor} strokeWidth="2" />
                <line x1="615" y1="412" x2="615" y2="428" stroke={circleColor} strokeWidth="2" />

                {/* Connecting circles */}
                <circle cx="400" cy="190" r="6" fill="var(--foreground)" stroke={circleColor} strokeWidth="2" />
                <circle cx="185" cy="320" r="6" fill="var(--foreground)" stroke={circleColor} strokeWidth="2" />
                <circle cx="400" cy="320" r="6" fill="var(--foreground)" stroke={circleColor} strokeWidth="2" />
                <circle cx="615" cy="320" r="6" fill="var(--foreground)" stroke={circleColor} strokeWidth="2" />
            </svg>
        </div>
    )
}

