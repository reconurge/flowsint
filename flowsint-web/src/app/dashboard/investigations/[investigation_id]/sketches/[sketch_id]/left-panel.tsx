"use client"

import { Button } from "@/components/ui/button"
import {
    ResizablePanel,
    ResizablePanelGroup
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ChevronDown, ChevronRight } from 'lucide-react'
import { memo } from "react"
import { actionItems } from "@/lib/action-items"
import { IconContainer } from "@/components/icon-container"

interface LeftPanelProps {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
}

export const LeftPanel = memo(function LeftPanel({ isCollapsed, setIsCollapsed }: LeftPanelProps) {
    return (
        <ResizablePanel
            defaultSize={15}
            minSize={10}
            maxSize={25}
            className="h-[calc(100vh_-_92px)] bg-card"
            collapsible={true}
            collapsedSize={2}
            onCollapse={() => setIsCollapsed(true)}
            onExpand={() => setIsCollapsed(false)}
        >
            {!isCollapsed ? (
                <div className="overflow-auto bg-card h-full flex flex-col w-full !p-0 !m-0">
                    <div>
                        <div className="p-2">
                            <div className="grid grid-cols-1 gap-1">
                                {actionItems.map((item) => {
                                    if (item.children && item.children.length > 0) {
                                        return (
                                            <Accordion key={item.id} type="single" collapsible className="border-b border-border">
                                                <AccordionItem value={item.id.toString()}>
                                                    <AccordionTrigger className="py-1 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <IconContainer
                                                                icon={item.icon}
                                                                type={item.type}
                                                            />
                                                            <span>{item.label}</span>
                                                            {item.comingSoon && <span className="ml-1 text-xs text-muted-foreground">(Soon)</span>}
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="grid grid-cols-1 gap-1 pl-2">
                                                            {item.children.map((childItem) => {
                                                                return (
                                                                    <div
                                                                        key={childItem.id}
                                                                        className={`flex cursor-grab items-center gap-2 rounded-md p-2 hover:bg-background ${childItem.disabled ? "opacity-50 cursor-not-allowed" : ""
                                                                            }`}
                                                                        draggable={!childItem.disabled}
                                                                    >
                                                                        <IconContainer
                                                                            icon={childItem.icon}
                                                                            type={childItem.type}
                                                                        />
                                                                        <span className="text-xs">
                                                                            {childItem.label}
                                                                            {childItem.comingSoon && (
                                                                                <span className="ml-1 text-xs text-muted-foreground">(Soon)</span>
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        );
                                    }

                                    // Otherwise, render it as a regular item
                                    return (
                                        <div
                                            key={item.id}
                                            className={`flex cursor-grab items-center gap-2 rounded-md p-1 hover:bg-background ${item.disabled ? "opacity-50 cursor-not-allowed" : ""
                                                }`}
                                            draggable={!item.disabled}
                                        >
                                            <IconContainer
                                                icon={item.icon}
                                                type={item.type}
                                            />
                                            <span className="text-xs">
                                                {item.label}
                                                {item.comingSoon && <span className="ml-1 text-xs text-muted-foreground">(Soon)</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex h-full items-center justify-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsCollapsed(false)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </ResizablePanel>
    );
});
