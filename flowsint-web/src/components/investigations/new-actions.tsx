"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"
import type React from "react" // Added import for React

export default function NewActions({ addNodes }: { addNodes: any }) {
    const { investigation_id } = useParams()
    const [open, setOpen] = useState(false)

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
            setOpen(false)
        } catch (error) {
            console.error("Error adding individual:", error)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
               { <Button variant="outline" size={"icon"} className="gap-2">
                    <Plus className="h-4 w-4" />
                </Button>}
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <form onSubmit={onSubmit} className="flex items-start space-x-3">
                    <Avatar>
                        <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                        <Input required name="full_name" placeholder="Name of the individual" />
                        <div className="flex justify-end">
                            <Button type="submit" size="sm">
                                Add
                            </Button>
                        </div>
                    </div>
                </form>
            </PopoverContent>
        </Popover>
    )
}

