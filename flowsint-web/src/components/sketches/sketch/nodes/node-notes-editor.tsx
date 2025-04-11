"use client"

import { useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, Italic, List, ListOrdered, Heading2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { Individual } from "@/types/sketch"
import Loader from "../../../loader"

interface NoteEditorModalProps {
    openNote: boolean
    individualId: string | null
    setOpenNote: (open: boolean) => void
}

export function NodeNotesEditor({ openNote, setOpenNote, individualId }: NoteEditorModalProps) {
    const { sketch_id, investigation_id } = useParams()
    const [isSaving, setIsSaving] = useState(false)
    const { data: individual = null, isLoading, error } = useQuery({
        queryKey: ["investigations", sketch_id, "individuals", individualId],
        queryFn: async (): Promise<Individual | null> => {
            const res = await fetch(`/api/investigations/${investigation_id}/sketches/${sketch_id}/individuals/${individualId}`)
            if (!res.ok) {
                return null
            }
            return res.json()
        },
        enabled: openNote,
        refetchOnWindowFocus: true,
    })


    const editor = useEditor({
        extensions: [StarterKit],
        immediatelyRender: false,
        content: "",
        editorProps: {
            attributes: {
                class: "min-h-[200px] border rounded-md p-4 focus:outline-none",
            },
        },
    })
    const saveNote = async () => {
        if (!editor) return
        const content = editor.getHTML()
        if (!content || content === "<p></p>") {
            toast.warning("Note cannot be empty")
            return
        }
        setIsSaving(true)
        try {
            const { error } = await supabase.from("individuals").update({
                notes: content
            }).eq("id", individualId)
            if (error) throw error
            toast.success("Note saved successfully")
            editor.commands.setContent("")
            setOpenNote(false)
        } catch (error) {
            console.error("Error saving note:", error)
            toast.error("Failed to save note")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={openNote} onOpenChange={setOpenNote}>
            {!isLoading && !individual && (
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Error</DialogTitle>
                        <DialogDescription>
                            <span>
                                {error ? <>An error occurred while fetching the individual:{JSON.stringify(error)}</> : <>Could not find individual.
                                </>}
                            </span></DialogDescription>
                    </DialogHeader>
                </DialogContent>
            )}
            {isLoading ?
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle></DialogTitle>
                        <DialogDescription></DialogDescription>
                    </DialogHeader>
                    <div className="h-[200px] flex items-center justify-center">
                        <Loader /> Loading...
                    </div>
                </DialogContent> : individual &&
                <DialogContent onContextMenu={(e) => e.stopPropagation()} className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Add Note for {individual?.full_name}</DialogTitle>
                        <DialogDescription>Create a new note for this individual. Click save when you're done.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 w-full">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor?.chain().focus().toggleBold().run()}
                                className={editor?.isActive("bold") ? "bg-muted" : ""}
                            >
                                <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor?.chain().focus().toggleItalic().run()}
                                className={editor?.isActive("italic") ? "bg-muted" : ""}
                            >
                                <Italic className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                                className={editor?.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
                            >
                                <Heading2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                className={editor?.isActive("bulletList") ? "bg-muted" : ""}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                                className={editor?.isActive("orderedList") ? "bg-muted" : ""}
                            >
                                <ListOrdered className="h-4 w-4" />
                            </Button>
                        </div>
                        <EditorContent editor={editor} className="min-h-[200px] overflow-x-auto w-full" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenNote(false)}>
                            Cancel
                        </Button>
                        <Button onClick={saveNote} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Note"}
                        </Button>
                    </DialogFooter>
                </DialogContent>}
        </Dialog>
    )
}

