"use client"

import { JSX, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, formatDistanceToNow } from "date-fns"
import { FileIcon, ImageIcon, MoreHorizontal } from "lucide-react"
import { useParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "../ui/skeleton"

interface Document {
    id: string
    name: string
    type: string
    size: number
    created_at: string
    last_updated_at: string
    url: string
    owner: {
        first_name: string
        last_name: string
    }
}

const icons: Record<string, JSX.Element> = {
    "png": <ImageIcon className="h-5 w-5 text-primary" />,
    "other": <FileIcon className="h-5 w-5 text-primary" />,
}

export function DocumentList() {
    const { project_id } = useParams<{ project_id: string }>()
    const [searchQuery, setSearchQuery] = useState("")
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewType, setPreviewType] = useState<string | null>(null)

    const {
        data: documents,
        isLoading,
        refetch,
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

    const filteredDocuments = documents?.filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase())) || []

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B"
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
        else return (bytes / 1048576).toFixed(1) + " MB"
    }

    const isPreviewable = (mimeType: string) => {
        return (
            mimeType.startsWith("image/") ||
            mimeType === "application/pdf" ||
            mimeType.startsWith("text/") ||
            mimeType.startsWith("video/")
        )
    }

    const previewFile = (url: string, type: string) => {
        setPreviewUrl(url)
        setPreviewType(type)
    }

    const downloadFile = async (url: string, fileName: string) => {
        try {
            const a = document.createElement("a")
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } catch (error) {
            console.error("Error downloading file:", error)
        }
    }
    if (isLoading) return (
        <>
            {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                    <TableCell>
                        <Skeleton className="h-4 w-full bg-foreground/5 rounded-md" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-4 w-full bg-foreground/5 rounded-md" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-4 w-full bg-foreground/5 rounded-md" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-4 w-full bg-foreground/5 rounded-md" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-4 w-full bg-foreground/5 rounded-md" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-4 w-full bg-foreground/5 rounded-md" />
                    </TableCell>
                </TableRow>))}
        </>)
    return (
        <>
            {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                    <TableCell>
                        <button
                            onClick={() => isPreviewable(doc.type) && previewFile(doc.url, doc.type)}
                            className="flex cursor-pointer truncate text-ellipsis items-center gap-2 hover:underline"
                        >
                            {icons[doc.type.split("/")[1]] || <FileIcon className="h-5 w-5 text-primary" />}
                            <span>{doc.name}</span>
                        </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                        {doc.type.split("/")[1]?.toUpperCase() || doc.type}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{`${doc.owner.first_name} ${doc.owner.last_name}`}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatFileSize(doc.size)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDistanceToNow(new Date(doc.last_updated_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {format(new Date(doc.created_at), "dd/MM/yyyy")}
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
                                {isPreviewable(doc.type) && (
                                    <DropdownMenuItem onClick={() => previewFile(doc.url, doc.type)}>Preview</DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => downloadFile(doc.url, doc.name)}>Download</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" disabled>
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
            ))}
            <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
                <DialogContent className="max-w-4xl w-[90vw]">
                    <DialogHeader>
                        <DialogTitle>File Preview</DialogTitle>
                        <DialogDescription>Preview of your document</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 max-h-[70vh] overflow-auto">
                        {previewUrl && previewType?.startsWith("image/") && (
                            <img
                                src={previewUrl || "/placeholder.svg"}
                                alt="Preview"
                                className="max-w-full h-auto mx-auto rounded-md"
                            />
                        )}
                        {previewUrl && previewType === "application/pdf" && (
                            <iframe src={`${previewUrl}#view=FitH`} className="w-full h-[60vh] rounded-md border" />
                        )}
                        {previewUrl && previewType?.startsWith("text/") && (
                            <iframe src={previewUrl} className="w-full h-[60vh] rounded-md border" />
                        )}
                        {previewUrl && previewType?.startsWith("video/") && (
                            <video src={previewUrl} controls className="max-w-full h-auto mx-auto rounded-md" />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

