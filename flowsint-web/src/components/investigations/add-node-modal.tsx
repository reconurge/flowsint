"use client"

import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { DialogClose, DialogContent } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import type React from "react" // Added import for React
import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog"
import { toast } from "sonner"

export default function AddNodeModal({ addNodes }: { addNodes: any }) {
    const { investigation_id } = useParams()

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData)
        try {
            const { data: node, error } = await supabase
                .from("individuals")
                .insert({ ...data, investigation_id: investigation_id?.toString() })
                .select("*")
                .single()
            if (error) throw error
            addNodes({
                id: node.id,
                type: "individual",
                data: { ...node, label: data.full_name },
                position: { x: -100, y: -100 },
            })
            toast.success("New node created.")

        } catch (error) {
            toast.error("Could not create new node:" + JSON.stringify(error))

        }
    }

    return (
        <DialogContent className="w-80">
            <DialogTitle className="text-xl font-bold">New node</DialogTitle>
            <DialogDescription className="opacity-60">Insert a new node.</DialogDescription>
            <form onSubmit={onSubmit} className="flex items-start space-x-3">
                <Avatar>
                    <AvatarFallback>A</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                    <Input required name="full_name" placeholder="Name of the individual" />
                    <div className="flex justify-end">
                        <DialogClose asChild>
                            <Button type="submit" size="sm">
                                Add
                            </Button>
                        </DialogClose>
                    </div>
                </div>
            </form>
        </DialogContent>
    )
}

