"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Investigation } from "@/types/investigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { clientFetch } from "@/lib/client-fetch"
import { toast } from "sonner"

interface InvestigationSettingsProps {
    investigation: Investigation
}

export function InvestigationSettings({ investigation }: InvestigationSettingsProps) {
    const queryClient = useQueryClient()
    const [name, setName] = useState(investigation?.name || "")
    const [description, setDescription] = useState(investigation?.description || "")

    const { mutate: updateInvestigation, isPending } = useMutation({
        mutationFn: async () => {
            const response = await clientFetch(`${process.env.NEXT_PUBLIC_FLOWSINT_API}/investigations/${investigation.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    name,
                    description,
                }),
            })
            return response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [process.env.NEXT_PUBLIC_FLOWSINT_API, "dashboard", "investigations"] })
            toast.success("Investigation updated successfully")
        },
        onError: (error) => {
            toast.error("Failed to update investigation")
            console.error("Error updating investigation:", error)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateInvestigation()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <Card className="p-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Investigation name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description for your investigation"
                            rows={4}
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Saving..." : "Save changes"}
                    </Button>
                </div>
            </Card>
        </form>
    )
} 