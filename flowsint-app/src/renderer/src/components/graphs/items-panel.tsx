"use client"

import { Button } from "@/components/ui/button"
import { PlusIcon, Search } from "lucide-react"
import { memo, useCallback, useState } from "react"
import { type ActionItem } from "@/lib/action-items"
import { DraggableItem } from "./draggable-item"
import { Input } from "@/components/ui/input"
import NewActions from "@/components/graphs/new-actions"
import { useActionItems } from "@/hooks/use-action-items"
import { SkeletonList } from "../shared/skeleton-list"

export const ItemsPanel = memo(function LeftPanel() {
    const [searchQuery, setSearchQuery] = useState<string>("")

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
    }, [])

    const { actionItems, isLoading } = useActionItems()

    return (
        <div className="bg-card p-4 h-full w-full overflow-y-auto flex flex-col">
            <div className="flex items-center gap-2 mb-3">
                <div>
                    <NewActions>
                        <Button
                            className="h-7 !w-7"
                            size="icon"
                            variant={"ghost"}
                        >
                            <PlusIcon />
                        </Button>
                    </NewActions>
                </div>
                <div className="relative grow">
                    <Search className="absolute left-2.5 top-1.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search type..."
                        className="pl-8 h-7 border-border"
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
                {isLoading ? <SkeletonList rowCount={8} /> :
                    actionItems?.map((item: ActionItem) => {
                        if (item.children && item.children.length > 0) {
                            return (
                                <div key={item.id} className="@container">
                                    <div className="py-1 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <span>{item.label} ({item.children.length})</span>
                                            {item.comingSoon && <span className="ml-1 text-xs text-muted-foreground">(Soon)</span>}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 @xs:grid-cols-3 @sm:grid-cols-4 @md:grid-cols-5 gap-2">
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
                                </div>
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
    )
})
