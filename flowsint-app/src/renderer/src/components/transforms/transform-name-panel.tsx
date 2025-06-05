"use client"

import { useState, useEffect, type KeyboardEvent, useRef } from "react"
import { Panel } from "@xyflow/react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { transformService } from "@/api/transfrom-service"

interface TransformDetailsPanelProps {
    transform?: {
        id: string
        name: string
        description?: string
    }
    onUpdate?: (updates: { name?: string; description?: string }) => void
    disabled?: boolean
}

export function TransformDetailsPanel({ transform, onUpdate, disabled = false }: TransformDetailsPanelProps) {
    const [name, setName] = useState<string>(transform?.name || "My Transform")
    const [description, setDescription] = useState<string>(transform?.description || "")
    const [isEditingName, setIsEditingName] = useState<boolean>(false)
    const [isEditingDesc, setIsEditingDesc] = useState<boolean>(false)
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const nameInputRef = useRef<HTMLInputElement>(null)
    const descInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (transform?.name) {
            setName(transform.name)
        }
        if (transform?.description !== undefined) {
            setDescription(transform.description)
        }
    }, [transform?.name, transform?.description])

    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus()
        }
    }, [isEditingName])

    useEffect(() => {
        if (isEditingDesc && descInputRef.current) {
            descInputRef.current.focus()
        }
    }, [isEditingDesc])

    const handleSaveField = async (field: "name" | "description", value: string) => {
        if (!transform?.id) return

        const trimmedValue = value.trim()
        if (field === "name" && trimmedValue === "") return

        if (
            (field === "name" && trimmedValue === transform.name) ||
            (field === "description" && trimmedValue === transform.description)
        ) {
            field === "name" ? setIsEditingName(false) : setIsEditingDesc(false)
            return
        }
        setIsSaving(true)
        try {
            const updates = { [field]: trimmedValue }
            console.log(updates)
            await transformService.update(transform.id, JSON.stringify(updates))
            if (onUpdate) {
                onUpdate(updates)
            }
            toast.success(`${field === "name" ? "Name" : "Description"} updated.`)
        } catch (error) {
            toast.error(`Failed to update transform ${field}`)
            if (field === "name") {
                setName(transform.name)
            } else {
                setDescription(transform.description || "")
            }
        } finally {
            setIsSaving(false)
            field === "name" ? setIsEditingName(false) : setIsEditingDesc(false)
        }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, field: "name" | "description", value: string) => {
        if (e.key === "Enter") {
            e.preventDefault()
            handleSaveField(field, value)
        } else if (e.key === "Escape") {
            if (field === "name") {
                setIsEditingName(false)
                setName(transform?.name || "My Transform")
            } else {
                setIsEditingDesc(false)
                setDescription(transform?.description || "")
            }
        }
    }

    return (
        <Panel position="top-left" className="m-4">
            <Card className="px-3 py-2 gap-1 w-sm rounded-mdgap-1">
                {isEditingName ? (
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => handleSaveField("name", name)}
                        onKeyDown={(e) => handleKeyDown(e, "name", name)}
                        disabled={disabled || isSaving}
                        className="!text-xl font-semibold bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none !px-1 !py-0.5 w-full"
                        placeholder="Enter transform name"
                    />
                ) : (
                    <h1
                        className="text-xl font-semibold cursor-pointer hover:bg-foreground/10 px-1 py-0.5 rounded-mdtransition-colors"
                        onClick={() => !disabled && setIsEditingName(true)}
                    >
                        {name || "My Transform"}
                    </h1>
                )}

                {isEditingDesc ? (
                    <input
                        ref={descInputRef}
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={() => handleSaveField("description", description)}
                        onKeyDown={(e) => handleKeyDown(e, "description", description)}
                        disabled={disabled || isSaving}
                        className="text-sm text-muted-foreground bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 w-full"
                        placeholder="Add a description..."
                    />
                ) : (
                    <p
                        className="text-sm text-muted-foreground cursor-pointer hover:bg-foreground/10 px-1 py-0.5 rounded-mdtransition-colors min-h-[1.5rem]"
                        onClick={() => !disabled && setIsEditingDesc(true)}
                    >
                        {description || <span className="italic text-gray-400">Add a description...</span>}
                    </p>
                )}
            </Card>
        </Panel>
    )
}
