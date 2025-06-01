"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, PlusIcon, Search, Waypoints } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { AvatarList } from "@/components/avatar-list"
import NewSketch from "@/components/dashboard/new-sketch"
import { Sketch } from "@/types/sketch"

interface SketchListProps {
    sketches: Sketch[]
    investigation_id: string
}

export function SketchList({ sketches, investigation_id }: SketchListProps) {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredSketches = sketches.filter(
        (sketch) => searchQuery === "" || sketch.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 justify-between">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search sketches..."
                        className="pl-8 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <NewSketch>
                    <Button size="sm" className="gap-2">
                        <PlusIcon className="h-4 w-4" /> New Sketch
                    </Button>
                </NewSketch>
            </div>

            <Card className="border rounded-md bg-card shadow-xs">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="hidden md:table-cell">Size</TableHead>
                            <TableHead className="hidden sm:table-cell">Members</TableHead>
                            <TableHead className="hidden sm:table-cell">Last modified</TableHead>
                            <TableHead className="hidden sm:table-cell">Creation</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSketches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center w-full py-2 text-muted-foreground">
                                    <div className="flex flex-col justify-center items-center p-3 gap-2">
                                        {searchQuery !== "" ? "No sketches found" : (
                                            <>
                                                No sketches yet
                                                <div className="mt-4">
                                                    <NewSketch noDropDown>
                                                        <Button size="sm" className="gap-2">
                                                            <PlusIcon className="h-4 w-4" />Create a new sketch
                                                        </Button>
                                                    </NewSketch>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSketches.map((sketch) => (
                                <TableRow key={sketch.id}>
                                    <TableCell>
                                        <Link href={`/dashboard/investigations/${investigation_id}/sketches/${sketch.id}`} className="flex items-center gap-2 hover:underline font-medium">
                                            <Waypoints className="h-5 w-5 text-muted-foreground opacity-60" />
                                            <span>{sketch.title}</span>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">Sketch</TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">
                                        {(sketch?.individuals?.length || 0) > 0 ? `${sketch?.individuals?.length} items` : "Empty"}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                                        <AvatarList
                                            size="md"
                                            users={sketch?.members?.map(member => ({
                                                ...member.profile,
                                                owner: member.profile.id === sketch.owner_id,
                                            })) || []}
                                        />
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                                        {formatDistanceToNow(new Date(sketch.last_updated_at), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                                        {format(new Date(sketch.created_at), "dd/MM/yyyy")}
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
            </Card>
        </div>
    )
} 