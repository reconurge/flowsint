"use client"

import type React from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { investigationService } from "@/api/investigation-service"
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { toast } from "sonner"
import { useRouter } from "@tanstack/react-router"
import { DialogTrigger } from "@radix-ui/react-dialog"

// Schema de validation Zod
const investigationSchema = z.object({
    name: z.string()
        .min(1, "Investigation name is required")
        .min(3, "Investigation name must be at least 3 characters")
        .max(100, "Investigation name must be less than 100 characters"),
    description: z.string()
        .max(500, "Description must be less than 500 characters")
        .optional()
})

type InvestigationFormData = z.infer<typeof investigationSchema>

interface NewInvestigationProps {
    children: React.ReactNode
    noDropDown?: boolean
}

export default function NewInvestigation({ children, noDropDown }: NewInvestigationProps) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    const form = useForm<InvestigationFormData>({
        resolver: zodResolver(investigationSchema),
        defaultValues: {
            name: "",
            description: ""
        }
    })

    const { handleSubmit, formState: { isSubmitting }, reset } = form

    const onSubmit = async (data: InvestigationFormData) => {
        try {
            const result = await investigationService.create(JSON.stringify(data))
            console.log(result)
            if (result.id) {
                toast.success("New investigation created.")
                router.navigate({ to: `/dashboard/investigations/${result.id}` })
                handleClose()
            } else {
                toast.error(result.error || "Failed to create investigation")
            }
        } catch (error) {
            console.error('Error creating investigation:', error)
            toast.error("An unexpected error occurred")
        }
    }

    const handleClose = () => {
        setOpen(false)
        reset() // Reset du formulaire avec React Hook Form
    }

    const InvestigationForm = () => (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 py-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Investigation name</FormLabel>
                                <FormControl>
                                    <Input
                                        required
                                        placeholder="Fraud suspicion"
                                        disabled={isSubmitting}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Investigation into a phishing campaign via LinkedIn."
                                        disabled={isSubmitting}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Creating..." : "Create Investigation"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )

    if (noDropDown) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><div>{children}</div></DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New investigation</DialogTitle>
                        <DialogDescription>Create a new blank investigation.</DialogDescription>
                    </DialogHeader>
                    <InvestigationForm />
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setOpen(true)}>
                        New investigation
                        <span className="ml-auto text-xs text-muted-foreground">⌘ E</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New investigation</DialogTitle>
                        <DialogDescription>Create a new blank investigation.</DialogDescription>
                    </DialogHeader>
                    <InvestigationForm />
                </DialogContent>
            </Dialog>
        </>
    )
}
