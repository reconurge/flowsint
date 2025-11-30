import { Button } from "@/components/ui/button"
import { Analysis } from "@/types"
import { formatDistanceToNow } from "date-fns"
import { Plus, FileText, ChevronRight } from "lucide-react"
import { EmptyAnalyses } from "../empty-states"
import NewAnalysis from "@/components/analyses/new-analysis"
import { Link } from "@tanstack/react-router"

interface AnalysesSectionProps {
  analyses: Analysis[]
}

export function AnalysesSection({ analyses }: AnalysesSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Analyses</h2>
        <NewAnalysis>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
            <Plus className="w-3.5 h-3.5" />
            New
          </Button>
        </NewAnalysis>
      </div>

      {analyses.length === 0 ?
        <div className="border border-dashed rounded-md">
          <EmptyAnalyses />
        </div> :
        <div className="space-y-1">
          {analyses.map((analysis) => (
            <Link
              to="/dashboard/investigations/$investigationId/$type/$id"
              params={{
                investigationId: analysis.investigation_id as string,
                type: "analysis",
                id: analysis.id
              }}
              key={analysis.id}
              className="group flex items-start gap-3 p-3 -mx-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-medium text-foreground text-sm truncate">{analysis.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{analysis.description}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground/70">
                  <span>{analysis.owner_id}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(analysis.last_updated_at), {
                    addSuffix: true
                  })}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
            </Link>
          ))}
        </div>}
    </section>
  )
}
