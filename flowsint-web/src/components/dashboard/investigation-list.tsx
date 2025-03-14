import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { AlertCircle, Calendar, Users } from "lucide-react"
import Link from "next/link"

interface Investigation {
    id: string
    title: string
    description: string
    status: string
    priority: string
    created_at: string
    relations_count: { count: number }
    individuals_counts: { count: number }
}

export default function InvestigationList({ investigation }: { investigation: Investigation }) {
    const priorityColors = {
        high: "text-red-500",
        medium: "text-amber-500",
        low: "text-green-500",
    }

    const statusColors = {
        active: "bg-green-500/10 text-green-500 border-green-500/20",
        pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        archived: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    }

    const statusText = {
        active: "Actif",
        pending: "En cours",
        archived: "Archivé",
    }

    const formattedDate = new Date(investigation.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })

    return (
        <Card className="overflow-hidden border shadow-none bg-background">
            <div className="flex items-center p-4 gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Link href={`/investigations/${investigation.id}`} className="hover:underline">
                            <CardTitle className="text-lg">{investigation.title}</CardTitle>
                        </Link>
                        <Badge variant="outline" className={statusColors[investigation.status as keyof typeof statusColors]}>
                            {statusText[investigation.status as keyof typeof statusText]}
                        </Badge>
                    </div>
                    <CardDescription className="line-clamp-1">{investigation.description}</CardDescription>

                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            <span>{investigation.individuals_counts.count} individus</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <AlertCircle
                                className={`h-3.5 w-3.5 ${priorityColors[investigation.priority as keyof typeof priorityColors]}`}
                            />
                            <span className={priorityColors[investigation.priority as keyof typeof priorityColors]}>
                                Priorité {investigation.priority}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}

