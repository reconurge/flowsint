import Link from "next/link"
import { Terminal } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Tool } from "@/types"

interface ToolCardProps {
    tool: Tool
}

export function ToolCard({ tool }: ToolCardProps) {
    return (
        <Card className="flex flex-col shadow-none bg-background rounded-md backdrop-blur">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    {tool.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                {tool.description && <p className="text-sm text-muted-foreground">{tool.description}</p>}
            </CardContent>
            <CardFooter>
                <a href={tool?.url || "#"} className="w-full">
                    <Badge variant="secondary" className="w-full justify-center">
                        View Details
                    </Badge>
                </a>
            </CardFooter>
        </Card>
    )
}

