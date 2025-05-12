"use client"

import { Button } from "@/components/ui/button"
import { ResizablePanel } from "@/components/ui/resizable"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ChevronRight } from "lucide-react"
import { memo, useCallback } from "react"
import { actionItems } from "@/lib/action-items"
import { DraggableItem } from "./draggable-item"

interface LeftPanelProps {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
}

export const LeftPanel = memo(function LeftPanel({ isCollapsed, setIsCollapsed }: LeftPanelProps) {
    const handleExpand = useCallback(() => setIsCollapsed(false), [setIsCollapsed])
    const handleCollapse = useCallback(() => setIsCollapsed(true), [setIsCollapsed])

    return (
        <ResizablePanel
            defaultSize={15}
            minSize={10}
            maxSize={25}
            className="h-[calc(100vh_-_92px)] bg-card"
            collapsible={true}
            collapsedSize={2}
            onCollapse={handleCollapse}
            onExpand={handleExpand}
        >
            {!isCollapsed ? (
                <div className="overflow-auto bg-card h-full flex flex-col w-full !p-0 !m-0">
                    <div className="p-4">
                        <div className="grid grid-cols-1 gap-2">
                            {actionItems.map((item) => {
                                if (item.children && item.children.length > 0) {
                                    return (
                                        <Accordion key={item.id} type="single" collapsible className="border-b border-border">
                                            <AccordionItem value={item.id.toString()}>
                                                <AccordionTrigger className="py-1 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span>{item.label}</span>
                                                        {item.comingSoon && <span className="ml-1 text-xs text-muted-foreground">(Soon)</span>}
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <div className="grid grid-cols-1 gap-2 p-2">
                                                        {item.children.map((childItem) => (
                                                            <DraggableItem
                                                                key={childItem.id}
                                                                label={childItem.label}
                                                                icon={childItem.icon}
                                                                type={childItem.type}
                                                                color={childItem.color}
                                                                disabled={childItem.disabled}
                                                                description={childItem.label}
                                                            />
                                                        ))}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    )
                                }

                                return (
                                    <DraggableItem
                                        key={item.id}
                                        label={item.label}
                                        icon={item.icon}
                                        type={item.type}
                                        color={item.color}
                                        disabled={item.disabled}
                                        description={item.label}
                                    />
                                )
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex h-full items-center justify-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExpand}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </ResizablePanel>
    )
})
