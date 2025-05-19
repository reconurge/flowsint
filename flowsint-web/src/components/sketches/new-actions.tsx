"use client"

import type React from "react"
import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { toast } from "sonner"
import { cn, flattenObj } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { actionItems, type ActionItem } from "@/lib/action-items"
import { Card, CardContent } from "@/components/ui/card"
import { AnimatePresence, motion } from "framer-motion"
import { DynamicForm } from "@/components/sketches/dynamic-form"
import { Badge } from "@/components/ui/badge"
import { saveNode } from "@/lib/actions/sketches"
import { useNodesDisplaySettings } from "@/store/node-display-settings"
import { useSketchStore } from "@/store/sketch-store"
import { shallow } from 'zustand/shallow'
import { DialogTrigger } from "@radix-ui/react-dialog"

interface ActionDialogProps {
    children: React.ReactNode
    setCurrentNode?: (node: any) => void
}

export default function ActionDialog({ children, setCurrentNode }: ActionDialogProps) {
    const { sketch_id } = useParams()
    const colors = useNodesDisplaySettings(s => s.colors)
    const {
        handleOpenFormModal,
        currentNodeType,
        openMainDialog,
        setOpenMainDialog,
        openFormDialog,
        setOpenFormDialog,
        addNode,
    } = useSketchStore(
        state => ({
            handleOpenFormModal: state.handleOpenFormModal,
            currentNodeType: state.currentNodeType,
            openMainDialog: state.openMainDialog,
            setOpenMainDialog: state.setOpenMainDialog,
            openFormDialog: state.openFormDialog,
            setOpenFormDialog: state.setOpenFormDialog,
            addNode: state.addNode,
        }),
        shallow
    )
    const [currentParent, setCurrentParent] = useState<ActionItem | null>(null)
    const [navigationHistory, setNavigationHistory] = useState<ActionItem[]>([])

    const handleAddNode = async (data: any) => {
        try {
            if (!currentNodeType || !sketch_id) {
                toast.error("Invalid node type or sketch ID.")
                return
            }
            const label_key = currentNodeType.fields.find((f) => f.name === currentNodeType.label_key)?.name || currentNodeType.fields[0].name
            const label = data[label_key as keyof typeof data]
            const type = currentNodeType.type
            const color = colors[type as keyof typeof colors]
            const newNode = {
                type: type,
                caption: label,
                color,
                data: {
                    ...flattenObj(data),
                    color,
                    label,
                    type,
                },
            }
            if (addNode) addNode(newNode as any)
            setOpenFormDialog(false)
            toast.success("New node added.")
            await saveNode({ node: newNode, sketch_id })
            if (setCurrentNode) setCurrentNode(newNode)
        } catch (error) {
            toast.error("Unexpected error during node creation.")
        } finally {
            setOpenMainDialog(false)
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
                            onSelect={item.children ? () => navigateToSubItems(item) : () => handleOpenFormModal(item.key)}
                        />
                    ))}
                </motion.div>
            </AnimatePresence>
        )
    }

    return (
        <>
            <Dialog open={openMainDialog} onOpenChange={setOpenMainDialog}>
                <DialogTrigger asChild>{children}</DialogTrigger>
                <DialogContent className="sm:max-w-[700px] h-[80vh] overflow-hidden flex flex-col">
                    <DialogTitle className="flex items-center">
                        {currentParent && (
                            <Button variant="ghost" size="icon" className="mr-2" onClick={navigateBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        {currentParent ? currentParent.label : "Select an action"}
                    </DialogTitle>
                    <DialogDescription>
                        {currentParent
                            ? `Select a type of ${currentParent.label.toLowerCase()} to add`
                            : "Choose an item to add"}
                    </DialogDescription>

                    <div className="overflow-y-auto overflow-x-hidden pr-1 -mr-1 flex-grow">{renderActionCards()}</div>
                </DialogContent>
            </Dialog>
            <Dialog open={openFormDialog} onOpenChange={setOpenFormDialog}>
                <DialogContent>
                    <DialogTitle>
                        {currentNodeType && (
                            <>Add {currentNodeType.label.toLowerCase()}</>
                        )}
                    </DialogTitle>
                    <DialogDescription>Feel the required data</DialogDescription>
                    {currentNodeType && (
                        <DynamicForm
                            currentNodeType={currentNodeType}
                            isForm={true}
                            onSubmit={handleAddNode}
                        />
                    )}
                </DialogContent >
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
                "cursor-pointer transition-all bg-card hover:border-primary border border-transparent hover:shadow-md",
                item.disabled && "opacity-50 cursor-not-allowed",
                "h-full",
            )}
            onClick={item.disabled ? undefined : onSelect}
        >
            <CardContent className="p-4 relative flex flex-col items-center text-center h-full">
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mb-3 mt-2"
                    style={{ backgroundColor: item.color ? `${item.color}20` : "var(--primary-20)" }}
                >
                    <Icon style={{ color: item.color }} className={cn("h-6 w-6 opacity-60", item.color ? "" : "text-primary")} />
                </div>
                <div className="font-medium text-sm">{item.label}</div>
                {item.disabled && (
                    <Badge variant="outline" className="mt-2 absolute top-2 left-2">
                        Soon
                    </Badge>
                )}
                {item.children && (
                    <div className="absolute top-3 right-4 text-xs text-muted-foreground mt-1">
                        <ArrowRight className="h-4 w-4" />
                    </div>
                )}
                {item.children && <div className="text-xs text-muted-foreground mt-1">{item.children.length} options</div>}
            </CardContent>
        </Card>
    )
}
