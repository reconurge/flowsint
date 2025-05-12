import { type ItemType, useNodesDisplaySettings } from "@/store/node-display-settings"

interface ColorBadgeProps {
    itemType: ItemType
    label?: string
    className?: string
}

export default function ColorBadge({ itemType, label, className = "" }: ColorBadgeProps) {
    const { colors } = useNodesDisplaySettings()

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
            style={{
                backgroundColor: colors[itemType],
                color: isLightColor(colors[itemType]) ? "#000" : "#fff",
            }}
        >
            {label || itemType.replace(/_/g, " ")}
        </span>
    )
}

// Helper function to determine if a color is light or dark
function isLightColor(color: string): boolean {
    // Convert hex to RGB
    const hex = color.replace("#", "")
    const r = Number.parseInt(hex.substr(0, 2), 16)
    const g = Number.parseInt(hex.substr(2, 2), 16)
    const b = Number.parseInt(hex.substr(4, 2), 16)

    // Calculate brightness (YIQ formula)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000

    // Return true if the color is light
    return brightness > 128
}
