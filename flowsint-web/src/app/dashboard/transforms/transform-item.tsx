"use client"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { hexToRgba } from "@/lib/utils"
import { useNodesDisplaySettings } from "@/store/node-display-settings"
import { FileCode2, Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"
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
    const color = useNodesDisplaySettings((state) => state.colors[transform.category as keyof typeof state.colors] || "#000000")
    const bgColor = useMemo(() => hexToRgba(color, 0.3), [color])

    return (
        <Link href={`/dashboard/transforms/${transform.id}`} className="block h-full transition-all">
            <Card className="h-full border hover:border-primary/50 hover:shadow-md transition-all">
                <CardHeader className="pb-2 relative">
                    <CardTitle className="text-lg w-full flex items-start justify-between font-medium">
                        <p className=" line-clamp-2">{transform.name}</p>
                        <Badge style={{ backgroundColor: bgColor }}>{transform.category.join(", ")}</Badge>
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
                <CardFooter className="flex justify-between pt-0">
                    {formattedDate && (
                        <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formattedDate}
                        </div>
                    )}
                    <div className="text-primary text-sm font-medium flex items-center">
                        View details
                        <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                </CardFooter>
            </Card>
        </Link>
    )
})