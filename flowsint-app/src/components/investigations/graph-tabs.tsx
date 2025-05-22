"use client"

import type React from "react"

import { useTabEditorStore, type GraphTab } from "@/store/tab-editor-store"
import { Waypoints, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "../ui/badge"
import { useActiveTabId, useSetActiveTab } from "@/hooks/active-tab-helper"

export function GraphTabs() {
    const tabs = useTabEditorStore((s: any) => s.tabs)
    const activeTabId = useActiveTabId()
    const setActiveTab = useSetActiveTab()
    const closeTab = useTabEditorStore((s: any) => s.closeTab)

    const handleCloseTab = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        closeTab(id)
    }
    return (
        <div className="flex bg-background w-full h-10 border-b overflow-x-auto">
            {tabs.map((tab: GraphTab) => (
                <TabButton
                    key={tab.id}
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    onClick={() => setActiveTab(tab.id)}
                    onClose={(e) => handleCloseTab(e, tab.id)}
                />
            ))}
        </div>
    )
}

interface TabButtonProps {
    tab: GraphTab
    isActive: boolean
    onClick: () => void
    onClose: (e: React.MouseEvent) => void
}

function TabButton({ tab, isActive, onClick, onClose }: TabButtonProps) {
    return (
        <div
            className={cn(
                "group flex items-center text-muted-foreground h-full px-3 text-sm border-b-2 border-b-transparent border-r cursor-pointer",
                isActive ? "border-b-primary text-foreground" : "hover:text-foreground",
            )}
            onClick={onClick}
        >
            <span className="truncate flex items-center gap-1 max-w-40">
                <Badge variant={"outline"} className="text-[.5rem] p-1 !py-.5 text-yellow-500 border-none"><Waypoints className="h-3 w-3" /> SKETCH</Badge>
                {tab.title}
                {tab.isDirty && " •"}
            </span>
            <button className="ml-2 opacity-50 group-hover:opacity-100 hover:bg-[#3c3c3c] rounded p-0.5" onClick={onClose}>
                <X size={14} />
            </button>
        </div>
    )
}
