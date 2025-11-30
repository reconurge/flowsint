
import { List, ArrowRightLeft, MapPin, ChevronDown } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { NetworkIcon } from "../icons/network"

interface ViewToggleProps {
    view: "graph" | "table" | "relationships" | "map"
    setView: (view: "graph" | "table" | "relationships" | "map") => void
}

export function ViewToggle({ view, setView }: ViewToggleProps) {
    const views = [
        { value: "graph", icon: NetworkIcon, label: "Graph" },
        { value: "table", icon: List, label: "Table" },
        { value: "relationships", icon: ArrowRightLeft, label: "Relationships" },
        { value: "map", icon: MapPin, label: "Map" },
    ] as const

    const currentView = views.find((v) => v.value === view)
    const CurrentIcon = currentView?.icon || NetworkIcon

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 bg-transparent">
                    <CurrentIcon strokeWidth={1.6} className="h-4 w-4 opacity-70" />
                    {currentView?.label} <ChevronDown />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={view} onValueChange={(value) => setView(value as typeof view)}>
                    {views.map(({ value, icon: Icon, label }) => (
                        <DropdownMenuRadioItem key={value} value={value}>
                            <Icon strokeWidth={1.4} className="h-4 w-4 opacity-70" />
                            {label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}