"use client"

import type React from "react"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createNewCase } from "@/lib/actions/investigations"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useFormStatus } from "react-dom"
import { toast } from "sonner"
import { useProjectStore } from "@/store/project-store"

function SubmitButton() {
    const { pending } = useFormStatus()


    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save"}
        </Button>
    )
}

export default function NewCase({ children, noDropDown = false }: { children: React.ReactNode, noDropDown?: boolean }) {
    const [open, setOpen] = useState(false)
    const { setOpenUploadModal } = useProjectStore()

    const router = useRouter()
    const { project_id } = useParams()


    async function handleNewCase(formData: FormData) {
        const result = await createNewCase(formData, project_id as string)
        if (result.success) {
            toast.success("New sketch created.")
            router.push(`/dashboard/projects/${project_id}/investigations/${result.id}`)
            setOpen(false)
        } else {
            toast.error("Could not create new sketch.")
        }
    }

    if (noDropDown) return (
        <>
            <Button asChild onClick={() => setOpen(true)}>{children}</Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New sketch</DialogTitle>
                        <DialogDescription>Create a new blank sketch.</DialogDescription>
                    </DialogHeader>
                    <form action={handleNewCase}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Investigation name</Label>
                                <Input id="title" name="title" placeholder="Suspicion de fraude" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    placeholder="Investigation sur une campagne de phishing via LinkedIn."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <SubmitButton />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setOpen(true)}>
                        New sketch
                        <span className="ml-auto text-xs text-muted-foreground">⌘ E</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setOpenUploadModal(true)}>
                        New document
                        <span className="ml-auto text-xs text-muted-foreground">⌘ D</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New sketch</DialogTitle>
                        <DialogDescription>Create a new blank sketch.</DialogDescription>
                    </DialogHeader>
                    <form action={handleNewCase}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Investigation name</Label>
                                <Input id="title" name="title" placeholder="Suspicion de fraude" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    placeholder="Investigation sur une campagne de phishing via LinkedIn."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <SubmitButton />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}

