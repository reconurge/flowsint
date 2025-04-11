"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MoreHorizontal, PlusIcon, RotateCwIcon, Search, SlidersHorizontal, Waypoints } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { notFound, useParams } from "next/navigation"
import Loader from "@/components/loader"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Sketch } from "@/types/sketch"
import NewSketch from "@/components/dashboard/new-sketch"
import { DocumentList } from "@/components/investigations/documents-list"
import { cn } from "@/lib/utils"
import { InvestigationNavigation } from "@/components/investigations/investigation-navigation"
import { Card } from "@/components/ui/card"

const DashboardPage = () => {
    const { investigation_id } = useParams()
    const [searchQuery, setSearchQuery] = useState("")

    const { data: investigation, isLoading: isLoadingInvestigations, isRefetching: isRefetchingInvestigations, refetch: refetchSketches } = useQuery({
        queryKey: ["dashboard", "investigation", investigation_id],
        queryFn: async () => {
            const res = await fetch(`/api/investigations/${investigation_id}`)
            if (!res.ok) {
                notFound()
            }
            return res.json()
        },
        refetchOnWindowFocus: true,
    })
    const {
        data: documents, isLoading: isLoadingDocs, isRefetching: isRefetchingDocs, refetch: refetchDocs
    } = useQuery({
        queryKey: ["investigations", investigation_id, "documents"],
        queryFn: async () => {
            const res = await fetch(`/api/investigations/${investigation_id}/documents`)
            if (!res.ok) {
                throw new Error("Failed to fetch documents")
            }
            return res.json() as Promise<Document[]>
        },
        refetchOnWindowFocus: true,
        enabled: !!investigation_id,
    })

    const handleRefetch = () => {
        refetchSketches()
        refetchDocs()
    }

    const isLoading = isLoadingDocs || isLoadingInvestigations
    const isRefetching = isRefetchingDocs || isRefetchingInvestigations

    return (
        <>
            <div className="sticky z-40 bg-background top-[48px] border-b">
                <InvestigationNavigation investigation_id={investigation_id as string} />
            </div>
            <div className="w-full space-y-8 container mx-auto py-12 px-8">
                <div className="flex items-center gap-2 justify-between mb-6">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 bg-background text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search items..."
                            className="pl-8 w-full bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <NewSketch>
                            <Button size="sm" className="gap-2">
                                <PlusIcon className="h-4 w-4" />  New
                            </Button>
                        </NewSketch>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <SlidersHorizontal className="h-4 w-4" />
                                    <span className="hidden sm:inline">Sort by</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>Name</DropdownMenuItem>
                                <DropdownMenuItem>Type</DropdownMenuItem>
                                <DropdownMenuItem>Date created</DropdownMenuItem>
                                <DropdownMenuItem>Date modified</DropdownMenuItem>
                                <DropdownMenuItem>Size</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={handleRefetch} disabled={isLoading || isRefetching} variant={"outline"} size="sm" className="gap-2">
                            <RotateCwIcon className={cn("h-4 w-4", isLoading || isRefetching && "animate-spin")} />  Refresh
                        </Button>
                    </div>
                </div>
                {isLoadingInvestigations ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader />
                    </div>
                ) : (
                    <Card className="border rounded-md bg-background shadow-xs">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead className="hidden md:table-cell">Size</TableHead>
                                    <TableHead className="hidden sm:table-cell">Last modified</TableHead>
                                    <TableHead className="hidden sm:table-cell">Creation</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {investigation.sketches.length === 0 && documents?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center w-full py-2 text-muted-foreground">
                                            <div className="flex flex-col justify-center items-center p-3 gap-2">
                                                No sketch yet or document yet.
                                                <NewSketch noDropDown>
                                                    <Button size="sm" className="gap-2">
                                                        <PlusIcon className="h-4 w-4" />  Create a new sketch
                                                    </Button>
                                                </NewSketch>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    investigation?.sketches?.map((sketch: Sketch) => (
                                        <TableRow key={sketch.id}>
                                            <TableCell>
                                                <Link href={`/dashboard/investigations/${sketch.investigation_id}/sketches/${sketch.id}`} className="flex items-center gap-2 hover:underline">
                                                    <Waypoints className="h-5 w-5 text-primary" />
                                                    <span>{sketch.title}</span>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{"Sketch"}</TableCell>
                                            <TableCell className="text-muted-foreground">{`${sketch?.owner?.first_name} ${investigation?.owner?.last_name}` || "You"}</TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">
                                                {(sketch?.individuals?.length || 0) > 0 ? `${sketch?.individuals?.length} items` : "Empty"}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                                                {formatDistanceToNow(new Date(sketch.last_updated_at), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                                                {format(new Date(investigation.created_at), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                <DocumentList refetch={refetchDocs} isLoading={isLoadingDocs} documents={documents} />
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div >
        </>
    )
}

export default DashboardPage

