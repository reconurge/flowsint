"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save"}
        </Button>
    )
}

export default function NewCase({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    async function handleNewCase(formData: FormData) {
        const result = await createNewCase(formData)
        if (result.success) {
            router.push(`/investigations/${result.id}`)
            setOpen(false)
        } else {
            console.error(result.error)
            // You might want to show an error message to the user here
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setOpen(true)}>
                        New case
                        <span className="ml-auto text-xs text-muted-foreground">⌘ E</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                        New organization
                        <Badge variant="outline" className="ml-2">
                            Soon
                        </Badge>
                        <span className="ml-auto text-xs text-muted-foreground">⌘ D</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New case</DialogTitle>
                        <DialogDescription>Create a new blank case.</DialogDescription>
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

