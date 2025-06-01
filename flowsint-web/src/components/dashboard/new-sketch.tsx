"use client"

import type React from "react"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createNewSketch } from "@/lib/actions/sketches"
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
import { useInvestigationStore } from "@/store/investigation-store"
import { DialogTrigger } from "@radix-ui/react-dialog"

function SubmitButton() {
    const { pending } = useFormStatus()


    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save"}
        </Button>
    )
}

export default function NewSketch({ children, noDropDown = false }: { children: React.ReactNode, noDropDown?: boolean }) {
    const [open, setOpen] = useState(false)
    const { setOpenUploadModal } = useInvestigationStore()
    const router = useRouter()
    const { investigation_id } = useParams()

    async function handleNewSketch(formData: FormData) {
        const result = await createNewSketch(formData, investigation_id as string)
        if (result.success) {
            toast.success("New sketch created.")
            router.push(`/dashboard/investigations/${investigation_id}/sketches/${result.id}`)
            setOpen(false)
        } else {
            toast.error(result.error)
        }
    }

    if (noDropDown) return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild onClick={() => setOpen(true)}>{children}</DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New sketch</DialogTitle>
                        <DialogDescription>Create a new blank sketch.</DialogDescription>
                    </DialogHeader>
                    <form action={handleNewSketch}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Sketch name</Label>
                                <Input id="title" name="title" placeholder="Fraud suspicion" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    placeholder="Fishing domain external scope"
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
                    <form action={handleNewSketch}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Investigation name</Label>
                                <Input id="title" name="title" placeholder="Fraud suspicion" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    placeholder="Investigation into a phishing campaign via LinkedIn."
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

