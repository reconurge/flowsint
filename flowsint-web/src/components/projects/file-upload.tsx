"use client"

import type React from "react"

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { sanitize } from '@/lib/utils'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { useProjectStore } from "@/store/project-store"
import { toast } from "sonner"
import { useParams } from "next/navigation"

type FileStatus = "idle" | "uploading" | "success" | "error"

interface FileWithStatus {
    file: File
    status: FileStatus
    progress: number
    error?: string
}

export default function FileUploadDialog() {
    const { project_id } = useParams()
    const { openUploadModal: open, setOpenUploadModal: setOpen } = useProjectStore()
    const [files, setFiles] = useState<FileWithStatus[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files).map((file) => ({
                file,
                status: "idle" as FileStatus,
                progress: 0,
            }))
            setFiles((prev) => [...prev, ...newFiles])
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map((file) => ({
                file,
                status: "idle" as FileStatus,
                progress: 0,
            }))
            setFiles((prev) => [...prev, ...newFiles])
        }
    }

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    }

    const uploadFiles = async () => {
        for (let i = 0; i < files.length; i++) {
            if (files[i].status !== "idle") continue

            // Update status to uploading
            setFiles((prev) => prev.map((file, idx) => (idx === i ? { ...file, status: "uploading" } : file)))
            try {
                const file = files[i].file
                const safeName = sanitize(file.name)
                const filePath = `${project_id}/${safeName}`
                // Upload file to Supabase
                const { error } = await supabase.storage.from("documents").upload(filePath, file)
                // Simulate progress tracking (if needed)
                setFiles((prev) => prev.map((file, idx) => (idx === i ? { ...file, progress: 100 } : file)))
                if (error) throw toast.error("Error uploading file: " + error.message)
                // Update status to success
                setFiles((prev) => prev.map((file, idx) => (idx === i ? { ...file, status: "success", progress: 100 } : file)))
            } catch (error) {
                toast.error("Error uploading file: " + JSON.stringify(error))
                setFiles((prev) =>
                    prev.map((file, idx) =>
                        idx === i
                            ? {
                                ...file,
                                status: "error",
                                error: error instanceof Error ? error.message : "Unknown error",
                            }
                            : file,
                    ),
                )
            }
        }
    }

    const handleButtonClick = () => {
        fileInputRef.current?.click()
    }

    const allFilesProcessed =
        files.length > 0 && files.every((file) => file.status === "success" || file.status === "error")
    const resetDialog = () => {
        setFiles([])
    }
    const closeDialog = () => {
        setOpen(false)
        setTimeout(resetDialog, 300) // Reset after dialog close animation
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[700px] overflow-y-auto max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Upload Files</DialogTitle>
                    <DialogDescription>Drag and drop files to upload to the documents bucket.</DialogDescription>
                </DialogHeader>
                <div
                    className={cn(
                        "mt-4 border-2 border-dashed rounded-lg p-6 transition-colors",
                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                        files.length > 0 ? "h-auto" : "h-40",
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {files.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Drag and drop files here or click to browse</p>
                            <Button variant="secondary" size="sm" className="mt-2" onClick={handleButtonClick}>
                                Select Files
                            </Button>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} multiple />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {files.map((fileItem, index) => (
                                <div key={index} className="flex items-start gap-3 bg-muted/50 p-3 rounded-md">
                                    <FileText className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(fileItem.file.size / 1024).toFixed(1)} KB</p>

                                        {fileItem.status === "uploading" && <Progress value={fileItem.progress} className="h-1 mt-2" />}

                                        {fileItem.status === "error" && <p className="text-xs text-destructive mt-1">{fileItem.error}</p>}
                                    </div>

                                    <div className="flex-shrink-0">
                                        {fileItem.status === "idle" && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
                                                <X className="h-4 w-4" />
                                                <span className="sr-only">Remove file</span>
                                            </Button>
                                        )}

                                        {fileItem.status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}

                                        {fileItem.status === "error" && <AlertCircle className="h-5 w-5 text-destructive" />}
                                    </div>
                                </div>
                            ))}

                            {!allFilesProcessed && (
                                <Button variant="secondary" size="sm" className="mt-2" onClick={handleButtonClick}>
                                    Add More Files
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    {allFilesProcessed ? (
                        <Button onClick={closeDialog}>Done</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={closeDialog}>
                                Cancel
                            </Button>
                            <Button onClick={uploadFiles} disabled={files.length === 0 || files.every((f) => f.status !== "idle")}>
                                Upload
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

