"use client"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { hexToRgba } from "@/lib/utils"
import { useNodesDisplaySettings } from "@/store/node-display-settings"
import { Link } from "@tanstack/react-router"
import { FileCode2, Calendar } from "lucide-react"
import { memo, useMemo } from "react"

export const TransformItem = memo(({ transform }: { transform: any }) => {
    const formattedDate = transform.created_at
        ? new Date(transform.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
        : null

    const stepsCount = transform?.transform_schema?.edges?.length || 0

    return (
        <Link to={`/dashboard/transforms/$transformId`} className="block h-full transition-all" params={{ transformId: transform.id }}>
            <Card className="h-full border hover:border-primary/50 hover:shadow-md transition-all">
                <CardHeader className="pb-2 relative">
                    <CardTitle className="text-lg w-full flex items-start justify-between font-medium">
                        <p className=" line-clamp-2">{transform.name}</p>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                        {transform.description || "No description provided"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <FileCode2 className="h-4 w-4 mr-1" />
                        <span>
                            {stepsCount} {stepsCount === 1 ? "step" : "steps"}
                        </span>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-2">
                    <div className="flex items-center justify-between w-full ">
                        {formattedDate && (
                            <div className="flex items-center text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formattedDate}
                            </div>
                        )}
                        <div className="flex gap-2 items-center flex-wrap">
                            {transform.category.map((category: string) => {
                                const color = useNodesDisplaySettings((state) => state.colors[category as keyof typeof state.colors] || "#000000")
                                const bgColor = useMemo(() => hexToRgba(color, 0.3), [color])
                                return <Badge key={category} style={{ backgroundColor: bgColor }}>{category}</Badge>
                            })}
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </Link>
    )
})