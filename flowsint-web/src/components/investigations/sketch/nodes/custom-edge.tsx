// EditableEdge.tsx
"use client"

import type React from "react"
import type { EdgeProps } from "@xyflow/react"
import { memo, useCallback, useState, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ButtonEdge } from "./button-edge"
import { toast } from "sonner"

const EditableEdge = memo((props: EdgeProps) => {
    const { id, label } = props
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [editValue, setEditValue] = useState((label as string) || "")
    const submitButtonRef = useRef<HTMLButtonElement>(null)

    // Utilisation de useCallback pour toutes les fonctions gestionnaires
    const handleEditClick = useCallback(() => {
        setIsEditing(true)
    }, [])

    const handleInputBlur = useCallback((e: React.FocusEvent) => {
        // Check if the related target (where focus is going) is the submit button
        if (submitButtonRef.current && submitButtonRef.current.contains(e.relatedTarget as Node)) {
            // Don't close the edit mode if clicking on the submit button
            return
        }
        setIsEditing(false)
    }, [])

    const handleSave = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (!id) return
            setIsLoading(true)
            try {
                const { error } = await supabase
                    .from("relationships")
                    .update({ relation_type: editValue })
                    .eq("id", id.toString())
                if (error) {
                    toast.error("An error occurred: " + error.message)
                } else {
                    toast.success("Relation updated.")
                }
            } catch (err) {
                toast.error("An error occurred.")
            } finally {
                setIsLoading(false)
                setIsEditing(false)
            }
        },
        [id, editValue],
    )

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditValue(e.target.value)
    }, [])

    // Mémorisation des props pour ButtonEdge pour éviter les re-rendus inutiles
    const buttonEdgeProps = useMemo(() => {
        // Filtrer les props que nous voulons passer à ButtonEdge
        const { label: _, ...restProps } = props;
        return restProps;
    }, [props.sourceX, props.sourceY, props.targetX, props.targetY, props.style, props.markerEnd]);

    // Mémorisation du contenu de formulaire pour éviter les re-rendus inutiles
    const formContent = useMemo(() => {
        if (isEditing) {
            return (
                <div className="flex items-center gap-1 bg-background border rounded-md p-1 shadow-sm">
                    <Input
                        autoFocus
                        value={editValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        className="h-5 text-xs max-w-28 rounded-sm"
                    />
                    <Button
                        ref={submitButtonRef}
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                </div>
            );
        }
        return (
            <Button
                onClick={handleEditClick}
                size="sm"
                variant="secondary"
                className={cn("text-xs px-1 py-.5 h-auto", !editValue && "opacity-70")}
            >
                {editValue || ""}
            </Button>
        );
    }, [isEditing, editValue, isLoading, handleInputChange, handleInputBlur, handleEditClick]);

    return (
        <ButtonEdge {...buttonEdgeProps}>
            <form onSubmit={handleSave} className="flex items-center justify-center h-full">
                {formContent}
            </form>
        </ButtonEdge>
    )
});

EditableEdge.displayName = "EditableEdge"

export default EditableEdge