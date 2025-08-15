
import { useState, useEffect, type KeyboardEvent, useRef } from "react"
import { Panel } from "@xyflow/react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { flowService } from "@/api/flow-service"

interface FlowDetailsPanelProps {
    flow?: {
        id: string
        name: string
        description?: string
    }
    onUpdate?: (updates: { name?: string; description?: string }) => void
    disabled?: boolean
}

export function FlowDetailsPanel({ flow, onUpdate, disabled = false }: FlowDetailsPanelProps) {
    const [name, setName] = useState<string>(flow?.name || "My Flow")
    const [description, setDescription] = useState<string>(flow?.description || "")
    const [isEditingName, setIsEditingName] = useState<boolean>(false)
    const [isEditingDesc, setIsEditingDesc] = useState<boolean>(false)
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const nameInputRef = useRef<HTMLInputElement>(null)
    const descInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (flow?.name) {
            setName(flow.name)
        }
        if (flow?.description !== undefined) {
            setDescription(flow.description)
        }
    }, [flow?.name, flow?.description])

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
        if (!flow?.id) return

        const trimmedValue = value.trim()
        if (field === "name" && trimmedValue === "") return

        if (
            (field === "name" && trimmedValue === flow.name) ||
            (field === "description" && trimmedValue === flow.description)
        ) {
            field === "name" ? setIsEditingName(false) : setIsEditingDesc(false)
            return
        }
        setIsSaving(true)
        try {
            const updates = { [field]: trimmedValue }
            await flowService.update(flow.id, JSON.stringify(updates))
            if (onUpdate) {
                onUpdate(updates)
            }
            toast.success(`${field === "name" ? "Name" : "Description"} updated.`)
        } catch (error) {
            toast.error(`Failed to update flow ${field}`)
            if (field === "name") {
                setName(flow.name)
            } else {
                setDescription(flow.description || "")
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
                setName(flow?.name || "My flow")
            } else {
                setIsEditingDesc(false)
                setDescription(flow?.description || "")
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
                        placeholder="Enter flow name"
                    />
                ) : (
                    <h1
                        className="text-xl font-semibold cursor-pointer hover:bg-foreground/10 px-1 py-0.5 rounded-mdtransition-colors"
                        onClick={() => !disabled && setIsEditingName(true)}
                    >
                        {name || "My flow"}
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
