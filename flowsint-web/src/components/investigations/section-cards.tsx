import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export function SectionCards() {
    return (
        <div className="shadow-xs grid-cols-2 xl:grid-cols-4 grid grid-cols-1 gap-4">
            <Card className="bg-card">
                <CardHeader className="relative">
                    <CardDescription>Active investigations</CardDescription>
                    <CardTitle className="md:text-4xl text-2xl font-semibold tabular-nums">
                        23
                    </CardTitle>
                    <div className="absolute right-4 top-4">
                        <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
                            <TrendingUpIcon className="size-3" />
                            +3
                        </Badge>
                    </div>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Trending up this month <TrendingUpIcon className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                        New investigations created
                    </div>
                </CardFooter>
            </Card>
            <Card className="bg-card">
                <CardHeader className="relative">
                    <CardDescription>Total investigations</CardDescription>
                    <CardTitle className="md:text-4xl text-2xl font-semibold tabular-nums">
                        237
                    </CardTitle>
                    <div className="absolute right-4 top-4">
                        <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
                            <TrendingDownIcon className="size-3" />
                            -20%
                        </Badge>
                    </div>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Down 20% this period <TrendingDownIcon className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                        Investigations created
                    </div>
                </CardFooter>
            </Card>
            <Card className="bg-card">
                <CardHeader className="relative">
                    <CardDescription>Nodes created</CardDescription>
                    <CardTitle className="md:text-4xl text-2xl font-semibold tabular-nums">
                        4 532
                    </CardTitle>
                    <div className="absolute right-4 top-4">
                        <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
                            <TrendingUpIcon className="size-3" />
                            +12.5%
                        </Badge>
                    </div>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Nodes created <TrendingUpIcon className="size-4" />
                    </div>
                    <div className="text-muted-foreground">Amount of nodes created this period</div>
                </CardFooter>
            </Card>
            <Card className="bg-card">
                <CardHeader className="relative">
                    <CardDescription>Collaborators</CardDescription>
                    <CardTitle className="md:text-4xl text-2xl font-semibold tabular-nums">
                        8
                    </CardTitle>
                    <div className="absolute right-4 top-4">
                        <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
                            <TrendingUpIcon className="size-3" />
                            +2
                        </Badge>
                    </div>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Active collaborators <TrendingUpIcon className="size-4" />
                    </div>
                    <div className="text-muted-foreground">Collaborators actively participating</div>
                </CardFooter>
            </Card>
        </div>
    )
}
