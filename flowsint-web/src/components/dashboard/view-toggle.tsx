"use client"
import { Button } from "@/components/ui/button"
import { Grid3X3, List } from "lucide-react"

type ViewMode = "grid" | "list"

interface ViewToggleProps {
    onViewChange: (view: ViewMode) => void
    currentView: ViewMode
}

export default function ViewToggle({ onViewChange, currentView }: ViewToggleProps) {
    return (
        <div className="flex items-center gap-1 md:gap-2">
            <Button
                variant={currentView === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => onViewChange("grid")}
            >
                <Grid3X3 className="h-4 w-4" />
                <span className="sr-only">Vue en grille</span>
            </Button>
            <Button
                variant={currentView === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => onViewChange("list")}
            >
                <List className="h-4 w-4" />
                <span className="sr-only">Vue en liste</span>
            </Button>
        </div>
    )
}

