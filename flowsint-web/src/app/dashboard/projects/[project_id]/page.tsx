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
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Investigation } from "@/types/investigation"
import NewCase from "@/components/dashboard/new-sketch"
import { DocumentList } from "@/components/projects/documents-list"
import { cn } from "@/lib/utils"
import DashboardLayout from "@/components/dashboard/layout"

const DashboardPage = () => {
    const { project_id } = useParams()
    const [searchQuery, setSearchQuery] = useState("")

    const { data: project, isLoading: isLoadingSketches, isRefetching: isRefetchingSketches, refetch: refetchSketches } = useQuery({
        queryKey: ["dashboard", "projects", project_id],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${project_id}`)
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
        queryKey: ["project", project_id, "documents"],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${project_id}/documents`)
            if (!res.ok) {
                throw new Error("Failed to fetch documents")
            }
            return res.json() as Promise<Document[]>
        },
        refetchOnWindowFocus: true,
        enabled: !!project_id,
    })

    const handleRefetch = () => {
        refetchSketches()
        refetchDocs()
    }

    const isLoading = isLoadingDocs || isLoadingSketches
    const isRefetching = isRefetchingDocs || isRefetchingSketches

    return (
        <DashboardLayout items={[{ name: "Projects", href: "/dashboard" }, { name: project?.name }]}>
            <div className="w-full space-y-8 container mx-auto py-12 px-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search items..."
                            className="pl-8 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <NewCase>
                            <Button size="sm" className="gap-2">
                                <PlusIcon className="h-4 w-4" />  Add
                            </Button>
                        </NewCase>
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
                {isLoadingSketches ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader />
                    </div>
                ) : (
                    <div className="border rounded-md">
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
                                {project.investigations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center w-full py-2 text-muted-foreground">
                                            No sketch yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    project?.investigations?.map((investigation: Investigation) => (
                                        <TableRow key={investigation.id}>
                                            <TableCell>
                                                <Link href={`/dashboard/projects/${investigation.project_id}/investigations/${investigation.id}`} className="flex items-center gap-2 hover:underline">
                                                    <Waypoints className="h-5 w-5 text-primary" />
                                                    <span>{investigation.title}</span>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{"Sketch"}</TableCell>
                                            <TableCell className="text-muted-foreground">{`${investigation?.owner?.first_name} ${project?.owner?.last_name}` || "You"}</TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">
                                                {(investigation?.individuals?.length || 0) > 0 ? `${investigation?.individuals?.length} items` : "Empty"}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                                                {formatDistanceToNow(new Date(investigation.last_updated_at), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                                                {format(new Date(project.created_at), "dd/MM/yyyy")}
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
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

export default DashboardPage

