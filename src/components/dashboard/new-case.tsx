"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
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

export default function NewCase({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    async function handleNewCase(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData)

        try {
            const { data: investigation, error } = await supabase.from("investigations").insert(data).select("id").single()

            if (error) throw error
            if (investigation) router.push(`/investigations/${investigation.id}`)
            setOpen(false)
        } catch (error) {
            console.error("Error creating new case:", error)
            // Handle error (e.g., show error message to user)
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
                    <form onSubmit={handleNewCase}>
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
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}

