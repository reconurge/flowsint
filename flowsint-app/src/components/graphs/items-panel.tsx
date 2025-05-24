"use client"

import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PlusIcon, Search } from "lucide-react"
import { memo, useCallback, useState } from "react"
import { type ActionItem, actionItems } from "@/lib/action-items"
import { DraggableItem } from "./draggable-item"
import { Input } from "@/components/ui/input"
import NewActions from "@/components/sketches/new-actions"

export const ItemsPanel = memo(function LeftPanel() {
    const [searchQuery, setSearchQuery] = useState<string>("")

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
    }, [])

    return (
        <div className="grow w-full overflow-auto ">
            <div className=" bg-card h-full flex flex-col w-full !p-0 !m-0">
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="relative grow">
                            <Search className="absolute left-2.5 top-1.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search type..."
                                className="pl-8 h-7"
                                value={searchQuery}
                                onChange={handleSearchChange}
                            />
                        </div>
                        <div>
                            <NewActions>
                                <Button
                                    className="h-7 !w-7 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary transition-all duration-300 text-white border-none"
                                    size="icon"
                                    variant={"ghost"}
                                >
                                    <PlusIcon />
                                </Button>
                            </NewActions>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {actionItems.map((item: ActionItem) => {
                            if (item.children && item.children.length > 0) {
                                return (
                                    <Accordion key={item.id} type="single" defaultValue={item.id.toString()} collapsible className="border-b border-border">
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
                                                            itemKey={childItem.key}
                                                            label={childItem.label}
                                                            icon={childItem.icon}
                                                            type={childItem.type}
                                                            color={childItem.color}
                                                            disabled={childItem.disabled}
                                                            description={childItem.fields.map((n) => n.name).join(", ")}
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
                                    itemKey={item.key}
                                    icon={item.icon}
                                    type={item.type}
                                    color={item.color}
                                    disabled={item.disabled}
                                    description={item.fields.map((n) => n.name).join(", ")}
                                />
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
})
