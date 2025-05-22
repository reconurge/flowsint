import { Button } from "@/components/ui/button"
import { Circle, HelpCircle, Info, Laptop, Trash, Unlock, Zap } from "lucide-react"

export function StatusBar() {
    return (
        <div className="flex items-center bg-card h-8 px-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <Laptop className="h-3 w-3" />
                    <span>Online</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <span>Console</span>
                </Button>
            </div>
            <div className="flex-1"></div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <Circle className="h-3 w-3 text-purple-500 fill-purple-500" />
                    <span>Postbot</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <span>Runner</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <Zap className="h-3 w-3" />
                    <span>Capture requests</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <span>Cloud Agent</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <span>Cookies</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <Unlock className="h-3 w-3" />
                    <span>Vault</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <Trash className="h-3 w-3" />
                    <span>Trash</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <Info className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                    <HelpCircle className="h-3 w-3" />
                </Button>
            </div>
        </div>
    )
}
