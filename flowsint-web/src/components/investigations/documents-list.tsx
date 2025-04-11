"use client"

import { JSX, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, formatDistanceToNow } from "date-fns"
import { FileIcon, FileJson, FileTextIcon, ImageIcon, MoreHorizontal } from "lucide-react"
import { useParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "../ui/skeleton"
import { useConfirm } from "../use-confirm-dialog"
import { toast } from "sonner"


const icons: Record<string, JSX.Element> = {
    "png": <ImageIcon className="h-5 w-5 text-foreground/30" />,
    "json": <FileJson className="h-5 w-5 text-yellow-500" />,
    "pdf": <FileTextIcon className="h-5 w-5 text-red-500" />,
    "other": <FileIcon className="h-5 w-5 text-primary" />,
}

export function DocumentList({ documents, isLoading, refetch }: { documents: any[] | undefined, isLoading: boolean, refetch: () => void }) {
    const { investigation_id } = useParams<{ investigation_id: string }>()
    const [searchQuery, setSearchQuery] = useState("")
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewType, setPreviewType] = useState<string | null>(null)
    const [previewName, setPreviewName] = useState<string | null>(null)
    const { confirm } = useConfirm()

    const filteredDocuments = documents?.filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase())) || []

    const isPreviewable = (mimeType: string) => {
        return (
            mimeType.startsWith("image/") ||
            mimeType === "application/pdf" ||
            mimeType.startsWith("text/") ||
            mimeType.startsWith("video/")
        )
    }

    const previewFile = (url: string, type: string, name: string) => {
        setPreviewUrl(url)
        setPreviewType(type)
        setPreviewName(name)
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

    const deleteFile = async (fileName: string) => {
        if (!await confirm({ title: `Are you sure you want to delete ${fileName}?`, message: "This action is irreversible." })) return
        try {
            const res = await fetch(`/api/investigations/${investigation_id}/documents?fileName=${encodeURIComponent(fileName)}`, {
                method: "DELETE",
            })
            if (!res.ok) {
                toast.error("An error occurred while deleting the file.")
            }
            toast.success("File deleted successfully.")
            refetch()
        } catch (error) {
            toast.error("An error occurred while deleting the file.")
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
                            onClick={() => isPreviewable(doc.type) && previewFile(doc.url, doc.type, doc.name)}
                            className="flex cursor-pointer max-w-[400px] items-center gap-2 hover:underline"
                        >
                            <div>{icons[doc.type.split("/")[1]] || <FileIcon className="h-5 w-5 text-primary" />}</div>
                            <span className="truncate text-ellipsis">{doc.name}</span>
                        </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                        {doc.type.split("/")[1]?.toUpperCase() || doc.type}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{`${doc.owner.first_name} ${doc.owner.last_name}`}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                        {doc.size}
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
                                    <DropdownMenuItem onClick={() => previewFile(doc.url, doc.type, doc.name)}>Preview</DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => downloadFile(doc.url, doc.name)}>Download</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => deleteFile(doc.name)}>
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow >
            ))
            }
            <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
                <DialogContent className="!max-w-none w-[95vw] !h-[95vh]">
                    <DialogHeader>
                        <DialogTitle>{previewName}</DialogTitle>
                        <DialogDescription>Preview of your document</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 h-full flex flex-col overflow-auto">
                        {previewUrl && previewType?.startsWith("image/") && (
                            <img
                                src={previewUrl || "/placeholder.svg"}
                                alt="Preview"
                                className="max-w-full h-auto mx-auto rounded-md"
                            />
                        )}
                        {previewUrl && previewType === "application/pdf" && (
                            <iframe src={`${previewUrl}#view=FitH`} className="w-full h-full grow rounded-md border" />
                        )}
                        {previewUrl && previewType?.startsWith("text/") && (
                            <iframe src={previewUrl} className="w-full h-full grow rounded-md border" />
                        )}
                        {previewUrl && previewType?.startsWith("video/") && (
                            <video src={previewUrl} controls className="h-full h-auto mx-auto rounded-md" />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

