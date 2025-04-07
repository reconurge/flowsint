"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createNewProject } from "@/lib/actions/projects"
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
import { useFormStatus } from "react-dom"
import { toast } from "sonner"

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save"}
        </Button>
    )
}

export default function NewProject({ children, noDropDown }: { children: React.ReactNode, noDropDown?: boolean }) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    async function handleNewProject(formData: FormData) {
        const result = await createNewProject(formData)
        if (result.success) {
            toast.success("New project created.")
            router.push(`/dashboard/projects/${result.id}`)
            setOpen(false)
        } else {
            toast.error("Could not create new project.")
        }
    }

    if (noDropDown) return (
        <>
            <Button asChild onClick={() => setOpen(true)}>{children}</Button>
            <Dialog  open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New project</DialogTitle>
                        <DialogDescription>Create a new blank project.</DialogDescription>
                    </DialogHeader>
                    <form action={handleNewProject}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Project name</Label>
                                <Input id="name" name="name" placeholder="Suspicion de fraude" required />
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
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setOpen(true)}>
                        New project
                        <span className="ml-auto text-xs text-muted-foreground">⌘ E</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New project</DialogTitle>
                        <DialogDescription>Create a new blank project.</DialogDescription>
                    </DialogHeader>
                    <form action={handleNewProject}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Project name</Label>
                                <Input id="name" name="name" placeholder="Suspicion de fraude" required />
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

