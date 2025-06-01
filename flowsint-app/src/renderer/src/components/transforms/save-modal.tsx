"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut"

interface TransformModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (name: string, description: string) => void
    isLoading: boolean
}

export function TransformModal({ open, onOpenChange, onSave, isLoading }: TransformModalProps) {
    const [name, setName] = useState("My Transform")
    const [description, setDescription] = useState("")
    const [nameError, setNameError] = useState("")

    useKeyboardShortcut({
        key: "s",
        ctrlOrCmd: true,
        callback: () => {
            handleSave()
        },
    })

    const handleSave = () => {
        if (!name.trim()) {
            setNameError("Transform name is required")
            return
        }
        onSave(name, description)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Save Transform</DialogTitle>
                    <DialogDescription>Give your transform a name and description before saving.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="flex items-center justify-between">
                            Name
                            {nameError && <span className="text-xs text-destructive">{nameError}</span>}
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                if (e.target.value.trim()) setNameError("")
                            }}
                            placeholder="Enter transform name"
                            className={nameError ? "border-destructive" : ""}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter a description (optional)"
                            className="resize-none"
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save transform"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
