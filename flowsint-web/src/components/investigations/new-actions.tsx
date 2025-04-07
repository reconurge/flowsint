"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuPortal,
    DropdownMenuContent,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { cn, nodesTypes } from "@/lib/utils"
import { Alert, AlertTitle, AlertDescription } from "../ui/alert"
import { Badge } from "../ui/badge"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog"
import { actionItems, type ActionItem } from "@/lib/action-items"
import { PlusIcon } from "lucide-react"
import { useInvestigationStore } from "@/store/investigation-store"

export default function NewActions({ addNodes }: { addNodes: any }) {
    const { investigation_id } = useParams()
    const [openAddNodeModal, setOpenNodeModal] = useState(false)
    const { setCurrentNode } = useInvestigationStore((state) => state)
    const [currentNodeType, setCurrentNodeType] = useState<any | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleOpenAddNodeModal = (e: { stopPropagation: () => void }, key: string) => {
        e.stopPropagation()
        if (!nodesTypes[key as keyof typeof nodesTypes]) {
            toast.error("Invalid node type.")
            return
        }
        setCurrentNodeType(nodesTypes[key as keyof typeof nodesTypes])
        setError(null)
        setOpenNodeModal(true)
    }

    const onSubmitNewNodeModal = async (e: {
        preventDefault: () => void
        currentTarget: HTMLFormElement | undefined
    }) => {
        e.preventDefault()
        const data = Object.fromEntries(new FormData(e.currentTarget))
        await handleAddNode(data)
    }

    const handleAddNode = async (data: any) => {
        try {
            setLoading(true)
            const dataToInsert = { ...data, investigation_id }
            const { data: nodeData, error: insertError } = await supabase
                .from(currentNodeType.table)
                .insert(dataToInsert)
                .select("*")
                .single()
            console.log(insertError)
            if (insertError) {
                toast.error("Failed to create node.")
                setLoading(false)
                return
            }
            if (!nodeData) {
                toast.error("Failed to create node.")
                setLoading(false)
                return
            }
            const newNode = {
                id: nodeData.id,
                type: currentNodeType.type,
                data: { ...nodeData, label: data[currentNodeType.fields[0]] },
                position: { x: 0, y: 0 },
            }
            addNodes(newNode)
            setCurrentNode(newNode)
            setOpenNodeModal(false)
            setError(null)
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    // Render a dropdown menu item
    const renderMenuItem = (item: ActionItem) => {
        const Icon = item.icon

        if (item.children) {
            return (
                <DropdownMenuSub key={item.id}>
                    <DropdownMenuSubTrigger>
                        <Icon style={{ color: item.color }} className={cn("mr-3 h-4 w-4 opacity-50", item.color)} />
                        {item.label}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                {item.children.map((childItem) => renderMenuItem(childItem))}
                            </div>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
            )
        }
        return (
            <DropdownMenuItem
                key={item.id}
                disabled={item.disabled}
                onClick={(e) => handleOpenAddNodeModal(e, item.key)}
                className="flex items-center"
            >
                <Icon style={{ color: item.color }} className="h-4 w-4 opacity-70" />
                <span className="truncate">{item.label}</span>
                {item.comingSoon && (
                    <Badge variant="outline" className="ml-2">
                        soon
                    </Badge>
                )}
            </DropdownMenuItem>
        )
    }

    // Divide items into two columns
    const splitIntoColumns = (items: ActionItem[]) => {
        const middleIndex = Math.ceil(items.length / 2);
        const column1 = items.slice(0, middleIndex);
        const column2 = items.slice(middleIndex);

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 min-w-[400px]">
                <div className="space-y-1">
                    {column1.map((item) => renderMenuItem(item))}
                </div>
                <div className="space-y-1 md:border-l md:pl-4">
                    {column2.map((item) => renderMenuItem(item))}
                </div>
            </div>
        );
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size={"icon"}>
                        <PlusIcon />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="p-2" align="start">
                    {splitIntoColumns(actionItems)}
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={openAddNodeModal && currentNodeType} onOpenChange={setOpenNodeModal}>
                <DialogContent>
                    <DialogTitle>New {currentNodeType?.type}</DialogTitle>
                    <DialogDescription>Add a new related {currentNodeType?.type}.</DialogDescription>
                    <form onSubmit={onSubmitNewNodeModal}>
                        <div className="flex flex-col gap-3">
                            {currentNodeType?.fields.map((field: any, i: number) => {
                                const [key, value] = field.split(":")
                                return (
                                    <label key={i}>
                                        <p className="my-2">{key}</p>
                                        <Input defaultValue={value || ""} name={key} placeholder={`Your value here (${key})`} />
                                    </label>
                                )
                            })}
                        </div>
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="flex items-center gap-2 justify-end mt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button disabled={loading} type="submit">
                                Save
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}