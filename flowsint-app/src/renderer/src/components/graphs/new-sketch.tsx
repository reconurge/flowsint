
import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useParams, useRouter } from "@tanstack/react-router"
import { sketchService } from "@/api/sketch-service"

type FormValues = {
    title: string
    description?: string
}

export default function NewSketch({
    children,
    noDropDown = false,
}: {
    children: React.ReactNode
    noDropDown?: boolean
}) {
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const { investigationId } = useParams({ strict: false })

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>()

    async function onSubmit(data: FormValues) {
        if (!investigationId) {
            toast.error("A sketch must be related to an investigation.")
            return
        }

        try {
            const payload = {
                ...data,
                investigation_id: investigationId,
            }
            const result = await sketchService.create(JSON.stringify(payload))

            if (result.id) {
                setOpen(false)
                toast.success("New sketch created.")
                router.navigate({
                    to: `/dashboard/investigations/${investigationId}/graph/${result.id}`,
                })
                reset()
            } else {
                toast.error(result.error || "Failed to create sketch.")
            }
        } catch (error) {
            toast.error("Unexpected error occurred.")
            console.error(error)
        }
    }

    const formContent = (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="title">Sketch name</Label>
                    <Input
                        id="title"
                        {...register("title", { required: "Title is required" })}
                        placeholder="Fraud suspicion"
                        aria-invalid={errors.title ? "true" : "false"}
                    />
                    {errors.title && (
                        <p role="alert" className="text-red-600 text-sm mt-1">
                            {errors.title.message}
                        </p>
                    )}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                        id="description"
                        {...register("description")}
                        placeholder="Phishing domain external scope"
                    />
                </div>
            </div>

            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        reset()
                        setOpen(false)
                    }}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                </Button>
            </DialogFooter>
        </form>
    )

    if (noDropDown) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <div>{children}</div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New sketch</DialogTitle>
                        <DialogDescription>Create a new blank sketch.</DialogDescription>
                    </DialogHeader>
                    {formContent}
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><div>{children}</div></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setOpen(true)}>
                        New sketch
                        {/* <span className="ml-auto text-xs text-muted-foreground">⌘ E</span> */}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                        New wall
                        {/* <span className="ml-auto text-xs text-muted-foreground">⌘ E</span> */}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New sketch</DialogTitle>
                        <DialogDescription>Create a new blank sketch.</DialogDescription>
                    </DialogHeader>
                    {formContent}
                </DialogContent>
            </Dialog>
        </>
    )
}
