"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronDown, FolderLockIcon, Grid, List, MoreHorizontal, PlusIcon, RotateCwIcon, Search, SlidersHorizontal } from "lucide-react"
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
            <div className="sticky z-40 bg-background w-full hidden md:flex top-[48px] border-b">
                <SubNav />
            </div>
            <div className="w-full space-y-8 container mx-auto py-12 px-8">
                <div className="flex items-center justify-between w-full gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="h-4 w-4 " />
                        </div>
                        <Input
                            type="text"
                            placeholder="Search investigations and investigations..."
                            className="pl-10 pr-16 py-2 h-10 text-sm bg-background"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <div className="flex items-center gap-1 text-xs">
                                <kbd className="px-1.5 py-0.5 bg-accent border rounded">⌘</kbd>
                                <kbd className="px-1.5 py-0.5 bg-accent border rounded">K</kbd>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="flex items-center gap-2 h-10">
                                    <span>Sort by activity</span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>Sort by name</DropdownMenuItem>
                                <DropdownMenuItem>Sort by date created</DropdownMenuItem>
                                <DropdownMenuItem>Sort by last updated</DropdownMenuItem>
                                <DropdownMenuItem>Sort by activity</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center border bg-background rounded-md overflow-hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`rounded-none ${viewMode === "grid" ? "bg-accent" : ""}`}
                                onClick={() => setViewMode("grid")}
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`rounded-none ${viewMode === "list" ? "bg-accent" : ""}`}
                                onClick={() => setViewMode("list")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <NewInvestigation>
                            <Button className="gap-2">
                                <PlusIcon className="h-4 w-4" />  New
                            </Button>
                        </NewInvestigation>
                    </div>
                </div>
                <div>
                    <RecentSketches />
                </div>
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
                    <Card className="border rounded-md bg-background shadow-xs">
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
                                                    <NewInvestigation noDropDown>
                                                        <Button size="sm" className="gap-2">
                                                            <PlusIcon className="h-4 w-4" />  Create a new investigation
                                                        </Button>
                                                    </NewInvestigation>
                                                </div>}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInvestigations.map((investigation: Investigation) => (
                                        <TableRow key={investigation.id}>
                                            <TableCell>
                                                <Link href={`dashboard/investigations/${investigation.id}`} className="flex items-center gap-2 hover:underline">
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
                                                <AvatarList users={investigation?.members?.map(({ profile }: { profile: { first_name: string, last_name: string, id: string } }) => ({ id: profile.id, name: `${profile.first_name} ${profile.last_name}`, owner: profile.id === investigation.owner_id })) || []} size="sm" />
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

