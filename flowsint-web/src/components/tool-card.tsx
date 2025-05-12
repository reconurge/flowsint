import { Terminal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Tool } from "@/types"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage } from "./ui/avatar"

interface ToolCardProps {
    tool: Tool
}

export function ToolCard({ tool }: ToolCardProps) {
    return (
        <Card className="flex flex-col shadow-none bg-card rounded-md relative">
            <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 mt-4">
                    {tool.avatar ?
                        <Avatar
                            className={cn(
                                'h-8 w-8',
                                "border-2 border bg-background relative",
                                "transition-transform",
                                "ring-0 ring-offset-0",
                            )}
                        >
                            <AvatarImage src={tool.avatar} alt={tool.name} />
                        </Avatar> :
                        <Terminal className="h-5 w-5" />}
                    {tool.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                {tool.description && <p className="text-sm text-muted-foreground">{tool.description}</p>}
            </CardContent>
            <div className="absolute top-2 right-2">
                {tool.active ? <Badge className="bg-green-500/15 text-green-500 text-xs shadow-none border-green-500/30">Active</Badge> :
                    <Badge className="bg-orange-500/15 text-orange-500 text-xs shadow-none border-orange-500/30">Coming soon</Badge>}
            </div>
        </Card >
    )
}

