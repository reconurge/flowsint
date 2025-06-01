"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, PlusIcon, Search, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { AvatarList } from "@/components/avatar-list"
import { Document } from "@/types/document"

interface DocumentListProps {
    documents: Document[]
    investigation_id: string
}

export function DocumentList({ documents, investigation_id }: DocumentListProps) {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredDocuments = documents.filter(
        (document) => searchQuery === "" || document.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 justify-between">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search documents..."
                        className="pl-8 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button size="sm" className="gap-2">
                    <PlusIcon className="h-4 w-4" /> Upload Document
                </Button>
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
                        {filteredDocuments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center w-full py-2 text-muted-foreground">
                                    <div className="flex flex-col justify-center items-center p-3 gap-2">
                                        {searchQuery !== "" ? "No documents found" : (
                                            <>
                                                No documents yet
                                                <div className="mt-4">
                                                    <Button size="sm" className="gap-2">
                                                        <PlusIcon className="h-4 w-4" />Upload a document
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDocuments.map((document) => (
                                <TableRow key={document.id}>
                                    <TableCell>
                                        <Link href={`/dashboard/investigations/${investigation_id}/documents/${document.id}`} className="flex items-center gap-2 hover:underline font-medium">
                                            <FileText className="h-5 w-5 text-muted-foreground opacity-60" />
                                            <span>{document.title}</span>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">Document</TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">
                                        {document.size ? `${Math.round(document.size / 1024)} KB` : "Unknown"}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                                        <AvatarList
                                            size="md"
                                            users={document?.members?.map(member => ({
                                                ...member.profile,
                                                owner: member.profile.id === document.owner_id,
                                            })) || []}
                                        />
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                                        {formatDistanceToNow(new Date(document.last_updated_at), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                                        {format(new Date(document.created_at), "dd/MM/yyyy")}
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
                                                <DropdownMenuItem>Download</DropdownMenuItem>
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

