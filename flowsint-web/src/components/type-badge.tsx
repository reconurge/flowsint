import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { memo } from "react"

type TypeBadgeProps = {
    type: string
    className?: string
}

const typeColorMap: Record<string, string> = {
    individual: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/40",
    phone: "bg-sky-100 text-sky-800 hover:bg-sky-100/80 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/40",
    address: "bg-amber-100 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/40",
    email: "bg-violet-100 text-violet-800 hover:bg-violet-100/80 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/40",
    ip: "bg-slate-100 text-slate-800 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800/60",
    social_account: "bg-pink-100 text-pink-800 hover:bg-pink-100/80 dark:bg-pink-900/30 dark:text-pink-300 dark:hover:bg-pink-900/40",
    vehicle: "bg-cyan-100 text-cyan-800 hover:bg-cyan-100/80 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/40",
    organization: "bg-orange-100 text-orange-800 hover:bg-orange-100/80 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/40",
    website: "bg-purple-100 text-purple-800 hover:bg-purple-100/80 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/40",
    document: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/40",
    financial: "bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/40",
    event: "bg-red-100 text-red-800 hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/40",
    device: "bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40",
    media: "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-100/80 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-900/40",
    education: "bg-teal-100 text-teal-800 hover:bg-teal-100/80 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/40",
    relationship: "bg-rose-100 text-rose-800 hover:bg-rose-100/80 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/40",
    online_activity: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/40",
    digital_footprint: "bg-lime-100 text-lime-800 hover:bg-lime-100/80 dark:bg-lime-900/30 dark:text-lime-300 dark:hover:bg-lime-900/40",
    biometric: "bg-amber-100 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/40",
    credential: "bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/60",
}

function TypeBadgeComponent({ type, className }: TypeBadgeProps) {
    const colorClasses = typeColorMap[type] || "bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/60"

    return (
        <Badge
            variant="outline"
            className={cn(colorClasses, "font-medium border-transparent", className)}
        >
            {type}
        </Badge>
    )
}

export const TypeBadge = memo(TypeBadgeComponent)
