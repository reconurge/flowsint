import { Network, FileText, Users, Shield, Paperclip, CheckCircle } from "lucide-react"
import { Investigation } from "@/types"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

type CaseOverviewPageProps = {
  investigation: Investigation
}
export function MetricsGrid({ investigation }: CaseOverviewPageProps) {
  const sketchCount = investigation.sketches?.length || 0
  const analysisCount = investigation.analyses?.length || 0
  const metrics = useMemo(() => [
    { label: "Sketches", value: sketchCount, icon: Network },
    { label: "Analyses", value: analysisCount, icon: FileText },
    { label: "Entities", value: "_", icon: Users },
    { label: "Relations", value: "_", icon: Shield },
    // { label: "Files", value: "34", icon: Paperclip },
    // { label: "Tasks", value: "6/15", icon: CheckCircle },
  ], [sketchCount, analysisCount])

  return (
    <div className={cn("grid border grid-cols-3  gap-px bg-border rounded-lg overflow-hidden my-6", `md:grid-cols-${metrics.length}`)} >
      {
        metrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-background px-4 py-4 flex flex-col items-center text-center transition-colors cursor-default"
          >
            <metric.icon className="w-4 h-4 text-muted-foreground mb-2" />
            <span className="text-xl font-semibold text-foreground">{metric.value}</span>
            <span className="text-xs text-muted-foreground mt-0.5">{metric.label}</span>
          </div>
        ))
      }
    </ div>
  )
}
