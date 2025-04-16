"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronDown, FolderLockIcon, Grid, List, MoreHorizontal, PlusIcon, RotateCwIcon, Search, SlidersHorizontal, TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { notFound } from "next/navigation"
import Loader from "@/components/loader"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Investigation } from "@/types/investigation"
import RecentSketches from "@/components/dashboard/recent-sketches"
import NewInvestigation from "@/components/dashboard/new-investigation"
import { AvatarList } from "@/components/avatar-list"
import { cn } from "@/lib/utils"
import { SubNav } from "@/components/dashboard/sub-nav"
import { Card } from "@/components/ui/card"
import StatusBadge from "@/components/investigations/status-badge"
import { InvestigationGraph } from "@/components/dashboard/charts/investigation-chart"
import { MetricsChart } from "@/components/dashboard/charts/metrics-chart"
import { SectionCards } from "@/components/investigations/section-cards"
import { DateRangePicker } from "@/components/date-range-picker"
const DashboardPage = () => {
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["dashboard", "investigations"],
        queryFn: async () => {
            const res = await fetch(`/api/investigations`)
            if (!res.ok || res.status === 404) {
                notFound()
            }
            return res.json()
        },
        refetchOnWindowFocus: true,
    })
    const investigations = data?.investigations || []
    const filteredInvestigations = investigations.filter(
        (investigation: Investigation) => searchQuery === "" || investigation.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    return (
        <>
            <div className="sticky z-40 bg-card w-full hidden md:flex top-[48px] border-b">
                <SubNav />
            </div>
            <div className="w-full space-y-4 container mx-auto py-12 px-8">
                <div className="flex grow items-center justify-between w-full gap-4">
                    <h1 className="font-bold text-2xl">Overview</h1>
                    <div className="flex items-center gap-2">
                        <DateRangePicker />
                        <NewInvestigation>
                            <Button className="gap-2">
                                <PlusIcon className="h-4 w-4" />  New
                            </Button>
                        </NewInvestigation>
                    </div>
                </div>
                <SectionCards />
                <div className="grid lg:grid-cols-5 gap-4 w-full">
                    <div className="lg:col-span-2 col-span-1 h-full">
                        <MetricsChart />
                    </div>
                    {/* <div className="col-span-1 h-full">
                        <MetricsChart />
                    </div> */}
                    <div className="lg:col-span-3 col-span-1 h-full">
                        <InvestigationGraph />
                    </div>
                </div>
                <h2 className="font-bold text-2xl mt-8">Recent sketches</h2>
                <RecentSketches limit={4} />
                <div className="flex items-center gap-2 justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <SlidersHorizontal className="h-4 w-4 opacity-60" />
                                    <span className="hidden sm:inline">Sort by</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>Name</DropdownMenuItem>
                                <DropdownMenuItem>Date created</DropdownMenuItem>
                                <DropdownMenuItem>Date modified</DropdownMenuItem>
                                <DropdownMenuItem>Size</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={() => refetch()} disabled={isLoading || isRefetching} variant={"outline"} size="sm" className="gap-2">
                            <RotateCwIcon className={cn("h-4 w-4", isLoading || isRefetching && "animate-spin")} />  Refresh
                        </Button>
                    </div>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader />
                    </div>
                ) : (
                    <Card className="border rounded-md bg-card shadow-xs">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="hidden md:table-cell">Status</TableHead>
                                    <TableHead className="hidden md:table-cell">Size</TableHead>
                                    <TableHead className="hidden sm:table-cell">Last modified</TableHead>
                                    <TableHead className="hidden sm:table-cell">Members</TableHead>
                                    <TableHead className="hidden sm:table-cell">Creation</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInvestigations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {searchQuery !== "" ? "No investigations found" :
                                                <div className="flex items-center flex-col gap-3">No investigations yet
                                                    <div className="mt-4">
                                                        <NewInvestigation noDropDown>
                                                            <Button size="sm" className="gap-2">
                                                                <PlusIcon className="h-4 w-4" />  Create a new investigation
                                                            </Button>
                                                        </NewInvestigation>
                                                    </div>
                                                </div>}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInvestigations.map((investigation: Investigation) => (
                                        <TableRow key={investigation.id}>
                                            <TableCell>
                                                <Link href={`/dashboard/investigations/${investigation.id}`} className="flex items-center gap-2 hover:underline font-medium">
                                                    <FolderLockIcon className="h-5 w-5 text-muted-foreground opacity-60" />
                                                    <span>{investigation.name}</span>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">
                                                <StatusBadge status={investigation.status as string} />
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">
                                                {(investigation.sketches?.length || 0) > 0 ? `${investigation.sketches.length} items` : "Empty"}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                                                {formatDistanceToNow(new Date(investigation.last_updated_at), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                                                <AvatarList
                                                    size="md"
                                                    users={
                                                        investigation?.members?.map(member => ({
                                                            ...member.profile,
                                                            owner: member.profile.id === investigation.owner_id,
                                                        })) || []
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                                                {format(new Date(investigation.created_at), "dd.MM.yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-10 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Actions</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>Open</DropdownMenuItem>
                                                        <DropdownMenuItem>Rename</DropdownMenuItem>
                                                        <DropdownMenuItem>Share</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>
        </>
    )
}

export default DashboardPage

