import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "../ui/skeleton"
import { useQueryState } from "nuqs"

export function SectionCards() {
    const [fromParam] = useQueryState("start", { defaultValue: "" })
    const [toParam] = useQueryState("end", { defaultValue: "" })

    const { data, isLoading: initialLoading, isRefetching } = useQuery({
        queryKey: ["dashboard", "metrics", "global", fromParam, toParam],
        queryFn: async () => {
            const res = await fetch(`/api/metrics/global?from=${fromParam}&end=${toParam}`)
            if (!res.ok || res.status === 404) {
                return
            }
            return res.json()
        },
        refetchOnWindowFocus: true,
    })
    const isLoading = initialLoading || isRefetching
    return (
        <div className="grid-cols-2 xl:grid-cols-4 grid grid-cols-1 gap-4">
            <Card className="bg-card">
                <CardHeader className="relative">
                    <CardDescription>Active investigations</CardDescription>
                    <CardTitle className="md:text-4xl text-2xl font-semibold tabular-nums">
                        {isLoading ? <Skeleton className="h-10 w-12 rounded-lg" /> : data.active_investigations}
                    </CardTitle>
                    <div className="absolute right-4 top-4">
                        <CustomBadge isLoading={isLoading} value={data?.active_investigations_string} />
                    </div>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Trending {data?.active_investigations_delta_string.startsWith("+") ? "up" : "down"} this month <TrendingUpIcon className="size-4" />
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
                        {isLoading ? <Skeleton className="h-10 w-12 rounded-lg" /> : data.total_investigations}
                    </CardTitle>
                    <div className="absolute right-4 top-4">
                        <CustomBadge isLoading={isLoading} value={data?.total_investigations_delta_string} />
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
                    <CardDescription>Individuals registered</CardDescription>
                    <CardTitle className="md:text-4xl text-2xl font-semibold tabular-nums">
                        {isLoading ? <Skeleton className="h-10 w-12 rounded-lg" /> : data?.total_nodes_created}
                    </CardTitle>
                    <div className="absolute right-4 top-4">
                        <CustomBadge isLoading={isLoading} value={data?.total_nodes_created_delta_string} />
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
                    <CardDescription>Successfull scans</CardDescription>
                    <CardTitle className="md:text-4xl text-2xl font-semibold tabular-nums">
                        {isLoading ? <Skeleton className="h-10 w-12 rounded-lg" /> : data?.total_succeeded_scans}
                    </CardTitle>
                    <div className="absolute right-4 top-4">
                        <CustomBadge isLoading={isLoading} value={data?.succeeded_scans_delta_string} />
                    </div>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Successful scans <TrendingUpIcon className="size-4" />
                    </div>
                    <div className="text-muted-foreground">Scans with success output.</div>
                </CardFooter>
            </Card>
        </div>
    )
}

const CustomBadge = ({ isLoading, value }: { isLoading: boolean, value: string }) => {
    const Icon = value?.startsWith("+") ? TrendingUpIcon : TrendingUpIcon
    if (isLoading) return (
        <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
            <TrendingUpIcon className="size-3" />
            {isLoading ? <Skeleton className="h-4 w-6 rounded-lg" /> : value}
        </Badge>
    )
    return (<Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
        <Icon className="size-3" />
        {isLoading ? <Skeleton className="h-4 w-6 rounded-lg" /> : value}
    </Badge>)
}