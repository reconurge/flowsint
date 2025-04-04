"use client"

import type { Investigation } from "@/types/investigation"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Search } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
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
            const res = await fetch(`/api/latest-investigations`)
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

    // return (
    //     <div className="space-y-4">
    //         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    //             <div className="rounded-lg border bg-card text-card-foreground p-6">
    //                 <div className="flex flex-row items-center justify-between space-y-0 pb-2">
    //                     <h3 className="tracking-tight text-sm font-medium">Investigations Actives</h3>
    //                     <FileSearch className="h-4 w-4 text-muted-foreground" />
    //                 </div>
    //                 <div className="text-2xl font-bold">24</div>
    //                 <p className="text-xs text-muted-foreground">+2 depuis le mois dernier</p>
    //             </div>
    //             <div className="rounded-lg border bg-card text-card-foreground p-6">
    //                 <div className="flex flex-row items-center justify-between space-y-0 pb-2">
    //                     <h3 className="tracking-tight text-sm font-medium">Sujets Suivis</h3>
    //                     <Users className="h-4 w-4 text-muted-foreground" />
    //                 </div>
    //                 <div className="text-2xl font-bold">145</div>
    //                 <p className="text-xs text-muted-foreground">+12 depuis le mois dernier</p>
    //             </div>
    //             <div className="rounded-lg border bg-card text-card-foreground p-6">
    //                 <div className="flex flex-row items-center justify-between space-y-0 pb-2">
    //                     <h3 className="tracking-tight text-sm font-medium">Documents Collectés</h3>
    //                     <FileText className="h-4 w-4 text-muted-foreground" />
    //                 </div>
    //                 <div className="text-2xl font-bold">532</div>
    //                 <p className="text-xs text-muted-foreground">+86 depuis le mois dernier</p>
    //             </div>
    //             <div className="rounded-lg border bg-card text-card-foreground p-6">
    //                 <div className="flex flex-row items-center justify-between space-y-0 pb-2">
    //                     <h3 className="tracking-tight text-sm font-medium">Alertes</h3>
    //                     <FileSearch className="h-4 w-4 text-muted-foreground" />
    //                 </div>
    //                 <div className="text-2xl font-bold">9</div>
    //                 <p className="text-xs text-muted-foreground">-2 depuis le mois dernier</p>
    //             </div>
    //         </div>
    //     </div>
    // )
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {investigations?.map((investigation: Investigation) => {
                return (
                    <Link href={`/dashboard/projects/${investigation.project_id}/investigations/${investigation.id}`} key={investigation.id} className="group">
                        <Card className="bg-background shadow-none h-full transition-all duration-200 hover:border-primary rounded-md">
                            <CardContent className="p-4 relative">
                                <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                                    {investigation?.project?.name}/{investigation.title}
                                </h3>
                                <span className="text-xs opacity-60 group-hover:text-primary">Last updated {formatDistanceToNow(investigation.last_updated_at, { addSuffix: true })}</span>
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

