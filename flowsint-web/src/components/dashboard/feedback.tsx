"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type React from "react" // Added import for React
import { toast } from "sonner"
import { Textarea } from "../ui/textarea"

export default function Feedback() {
    const [open, setOpen] = useState(false)

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData)
        try {
            const { error } = await supabase
                .from("feedbacks")
                .insert({ ...data })
            if (error) return toast.error("Could not create new feedback:" + JSON.stringify(error))
            toast.success("Feedback submitted.")
            setOpen(false)
        } catch (error) {
            toast.error("Could not create new feedback:" + JSON.stringify(error))
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button size={"sm"} variant={"ghost"}>Feedback</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
                <form onSubmit={onSubmit} className="flex items-start space-x-3">
                    <div className="flex-1 space-y-2">
                        <Textarea required name="content" placeholder="Your feedback" />
                        <div className="flex justify-end">
                            <Button type="submit" size="sm">
                                Send feedback
                            </Button>
                        </div>
                    </div>
                </form>
            </PopoverContent>
        </Popover>
    )
}

