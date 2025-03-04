import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, MoreHorizontal, Network } from "lucide-react"
import Link from "next/link"

// Composant pour afficher la barre de progression
// Pour l'instant on garde la primary
function ProgressBar({ value = 35 }: { value?: number }) {
    let color = "bg-primary"
    if (value < 30) color = "bg-primary"
    else if (value < 70) color = "bg-primary"
    else color = "bg-primary"

    return (
        <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
            <div className={`${color} h-1.5 rounded-full`} style={{ width: `${value}%` }}></div>
        </div>
    )
}

// Composant pour afficher un avatar avec initiales
function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" | "lg" }) {
    const initials = name.charAt(0).toUpperCase()
    const colors = {
        a: "bg-red-500",
        m: "bg-blue-500",
        t: "bg-green-500",
        s: "bg-purple-500",
        j: "bg-amber-500",
    }
    const color = colors[name.charAt(0).toLowerCase() as keyof typeof colors] || "bg-gray-500"

    const sizes = {
        sm: "w-6 h-6 text-xs",
        md: "w-8 h-8 text-sm",
        lg: "w-10 h-10 text-base",
    }

    return (
        <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-medium`}>
            {initials}
        </div>
    )
}

// Composant pour afficher le statut
function StatusBadge({ status = "active" }: { status?: string }) {
    const statusConfig = {
        active: {
            class: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
            label: "Active",
        },
        pending: {
            class: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
            label: "Pending",
        },
        archived: {
            class: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
            label: "Archived",
        },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active

    return (
        <Badge variant="outline" className={`${config.class} border-0`}>
            {config.label}
        </Badge>
    )
}

// Composant pour afficher la priorité
function PriorityBadge({ priority = "medium" }: { priority?: string }) {
    const colors = {
        low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
        critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    }

    return (
        <Badge variant="outline" className={`${colors[priority as keyof typeof colors] || colors.medium} border-0`}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </Badge>
    )
}

export default function Investigation({ investigation }: { investigation: any }) {
    // Utiliser les données de l'investigation ou des valeurs par défaut
    const {
        id,
        title,
        description = "No description provided.",
        status = "active",
        progress = 35,
        lastUpdated = new Date().toISOString(),
        tags = ["investigation", "osint", "pedo"],
        team = ["E", "J"],
        priority = "medium",
        entities = investigation?.["individuals_counts"]?.[0]?.count || 0,
        connections = investigation?.["relations_counts"]?.[0]?.count || 0,
        location = "Not specified",
    } = investigation

    return (
        <Card className="overflow-hidden h-full shadow-none bg-background">
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                        <Link href={`/investigations/${id}`} className="hover:underline">
                            {title}
                        </Link>
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Options</span>
                    </Button>
                </div>
                {description && <CardDescription className="line-clamp-2">{description}</CardDescription>}
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-sm">
                        <StatusBadge status={status} />
                    </div>
                    {/* <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progression</span>
                            <span className="font-medium">{progress}%</span>
                        </div>
                        <ProgressBar value={progress} />
                    </div> */}
                    {/* <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{location}</span>
                    </div> */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Network className="h-3.5 w-3.5" />
                        <span>
                            {entities} entities, {connections} connections
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto">
                <div className="flex -space-x-2">
                    {team.map((member: string) => (
                        <Avatar key={member} name={member} size="sm" />
                    ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                        {new Date(lastUpdated).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                        })}
                    </span>
                </div>
            </CardFooter>
        </Card>
    )
}

