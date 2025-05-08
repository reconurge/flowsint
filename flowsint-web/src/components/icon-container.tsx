import { useColorSettings } from "@/store/color-settings"
import type { LucideIcon } from "lucide-react"
import { useMemo } from "react"

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number) => {
    const r = Number.parseInt(hex.slice(1, 3), 16)
    const g = Number.parseInt(hex.slice(3, 5), 16)
    const b = Number.parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

interface IconContainerProps {
    type: string
    icon: LucideIcon
    size?: number
}

export function IconContainer({ type, icon: Icon, size = 12 }: IconContainerProps) {
    const containerSize = size + 16 // Make container slightly larger than icon
    const color = useColorSettings((state) => state.colors[type as keyof typeof state.colors] || "#000000")
    const bgColor = useMemo(() => hexToRgba(color, 0.3), [color])

    return (
        <div>
            <div
                style={{
                    border: `${size/4}px solid ${bgColor}`,
                    width: `${containerSize}px`,
                    height: `${containerSize}px`,
                }}
                className="flex bg-card items-center justify-center rounded-full"
            >
                <Icon size={size} className="text-foreground" />
            </div>
        </div>
    )
}