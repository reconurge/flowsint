"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FolderLockIcon, MoreHorizontal, PlusIcon, RotateCwIcon, Search, SlidersHorizontal } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { notFound } from "next/navigation"
import Loader from "@/components/loader"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Project } from "@/types/project"
import RecentSketches from "@/components/dashboard/recent-sketches"
import NewProject from "@/components/dashboard/new-project"
import { AvatarList } from "@/components/avatar-list"
import { cn } from "@/lib/utils"
import DashboardLayout from "@/components/dashboard/layout"
import { SubNav } from "@/components/dashboard/sub-nav"

const DashboardPage = () => {
    const [searchQuery, setSearchQuery] = useState("")

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["dashboard", "projects"],
        queryFn: async () => {
            const res = await fetch(`/api/projects`)
            if (!res.ok || res.status === 404) {
                notFound()
            }
            return res.json()
        },
        refetchOnWindowFocus: true,
    })
    const projects = data?.projects || []
    const filteredProjects = projects.filter(
        (project: Project) => searchQuery === "" || project.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    return (
        <>
            <div className="sticky z-40 bg-background w-full hidden md:flex top-[48px] border-b">
                <SubNav />
            </div>
            <div className="w-full space-y-8 mx-auto py-12 px-8">
                <div className="flex items-center gap-2 justify-between">
                    <h1 className="text-2xl font-bold">Overview</h1>
                    <Button>New investigation</Button>
                </div>
                <div>

                    <RecentSketches />
                </div>
                <div className="flex items-center gap-2 justify-between mb-6">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search projects..."
                            className="pl-8 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <NewProject>
                            <Button size="sm" className="gap-2">
                                <PlusIcon className="h-4 w-4" />  Add
                            </Button>
                        </NewProject>
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
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead className="hidden md:table-cell">Size</TableHead>
                                    <TableHead className="hidden sm:table-cell">Last modified</TableHead>
                                    <TableHead className="hidden sm:table-cell">Members</TableHead>
                                    <TableHead className="hidden sm:table-cell">Creation</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProjects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {searchQuery !== "" ? "No projects found" :
                                                <div className="flex items-center flex-col gap-3">No projects yet
                                                    <NewProject noDropDown>
                                                        <Button size="sm" className="gap-2">
                                                            <PlusIcon className="h-4 w-4" />  Create a new project
                                                        </Button>
                                                    </NewProject>
                                                </div>}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProjects.map((project: Project) => (
                                        <TableRow key={project.id}>
                                            <TableCell>
                                                <Link href={`dashboard/projects/${project.id}`} className="flex items-center gap-2 hover:underline">
                                                    <FolderLockIcon className="h-5 w-5 text-primary" />
                                                    <span>{project.name}</span>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{`${project?.owner?.first_name} ${project?.owner?.last_name}` || "You"}</TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">
                                                {(project.investigations?.length || 0) > 0 ? `${project.investigations.length} items` : "Empty"}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                                                {formatDistanceToNow(new Date(project.last_updated_at), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                                                <AvatarList users={[{ id: "1", name: "Jean" }, { id: "2", name: "Eliott" }, { id: "4", name: "Marc" }, { id: "2", name: "Frank" }]} size="sm" />
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                                                {format(new Date(project.created_at), "dd.MM.yyyy")}
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
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </>
    )
}

export default DashboardPage

