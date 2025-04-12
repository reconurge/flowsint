"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, ArrowLeft, ArrowRight, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { cn, nodesTypes } from "@/lib/utils"
import { Alert, AlertTitle, AlertDescription } from "../ui/alert"
import { Badge } from "../ui/badge"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog"
import { actionItems, type ActionItem } from "@/lib/action-items"
import { useSketchStore } from "@/store/sketch-store"
import { Card, CardContent } from "@/components/ui/card"
import { AnimatePresence, motion } from "framer-motion"

export default function PanelContextMenu({ addNodes }: { addNodes: any }) {
    const { sketch_id } = useParams()
    const [openAddNodeModal, setOpenNodeModal] = useState(false)
    const [_, setOpenActionDialog] = useState(false)
    const { setCurrentNode } = useSketchStore((state) => state)
    const [currentNodeType, setCurrentNodeType] = useState<any | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [currentParent, setCurrentParent] = useState<ActionItem | null>(null)
    const [navigationHistory, setNavigationHistory] = useState<ActionItem[]>([])
    const handleOpenAddNodeModal = (key: string) => {
        if (!nodesTypes[key as keyof typeof nodesTypes]) {
            toast.error("Invalid node type.")
            return
        }
        setCurrentNodeType(nodesTypes[key as keyof typeof nodesTypes])
        setError(null)
        setOpenActionDialog(false)
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
            const dataToInsert = { ...data, sketch_id }
            const { data: nodeData, error: insertError } = await supabase
                .from(currentNodeType.table)
                .insert(dataToInsert)
                .select("*")
                .single()
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
                type: "custom",
                data: {
                    ...nodeData, label: data[currentNodeType.fields[0]], type: currentNodeType.type,
                },
                position: { x: 0, y: 0 },
            }
            addNodes(newNode)
            setCurrentNode(newNode)
            setError(null)
            toast.success("Node successfully created.")
        } catch (error) {
            toast.error("An unexpected error occurred.")
        } finally {
            setLoading(false)
            setOpenNodeModal(false)
        }
    }
    const navigateToSubItems = (item: ActionItem) => {
        setNavigationHistory([...navigationHistory, item])
        setCurrentParent(item)
    }
    const navigateBack = () => {
        const newHistory = [...navigationHistory]
        newHistory.pop()
        setNavigationHistory(newHistory)
        setCurrentParent(newHistory.length > 0 ? newHistory[newHistory.length - 1] : null)
    }

    const renderActionCards = () => {
        const items = currentParent ? currentParent.children || [] : actionItems

        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentParent?.id || "root"}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-1 pb-2"
                >
                    {items.map((item) => (
                        <ActionCard
                            key={item.id}
                            item={item}
                            onSelect={item.children ? () => navigateToSubItems(item) : () => handleOpenAddNodeModal(item.key)}
                        />
                    ))}
                </motion.div>
            </AnimatePresence>
        )
    }
    return (
        <>
            <DialogContent className="sm:max-w-[700px] h-[80vh] overflow-hidden flex flex-col">
                <DialogTitle className="flex items-center">
                    {currentParent && (
                        <Button variant="ghost" size="icon" className="mr-2" onClick={navigateBack}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    {currentParent ? currentParent.label : "Select action"}
                </DialogTitle>
                <DialogDescription>
                    {currentParent
                        ? `Select a ${currentParent.label} type to add`
                        : "Choose an action to add to your investigation"}
                </DialogDescription>

                <div className="overflow-y-auto overflow-x-hidden pr-1 -mr-1 flex-grow">{renderActionCards()}</div>
            </DialogContent>
            {/* Node Creation Dialog */}
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

interface ActionCardProps {
    item: ActionItem
    onSelect: () => void
}

function ActionCard({ item, onSelect }: ActionCardProps) {
    const Icon = item.icon

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all bg-accent hover:scale-105 hover:shadow-md",
                item.disabled && "opacity-50 cursor-not-allowed",
                "h-full",
            )}
            onClick={item.disabled ? undefined : onSelect}
        >
            <CardContent className="p-4 relative flex flex-col items-center text-center h-full">
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mb-3 mt-2"
                    style={{ backgroundColor: `${item.color}20` }} // Light background based on item color
                >
                    <Icon style={{ color: item.color }} className="h-6 w-6 opacity-60 text-primary" />
                </div>
                <div className="font-medium text-sm">{item.label}</div>
                {item.comingSoon && (
                    <Badge variant="outline" className="mt-2 absolute top-2 left-2">
                        soon
                    </Badge>
                )}
                {item.children && <div className="absolute top-3 right-4 text-xs text-muted-foreground mt-1"><ArrowRight className="h-4 w-4" /></div>}
                {item.children && <div className="text-xs text-muted-foreground mt-1">{item.children.length} options</div>}
            </CardContent>
        </Card>
    )
}
