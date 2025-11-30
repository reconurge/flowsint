import { FolderOpen, FileText, Network, Clock } from "lucide-react"
import { useMemo } from "react"

type DashboardStatsProps = {
  casesCount: number,
  activeCasesCount: number,
}

export function DashboardStats({ casesCount, activeCasesCount }: DashboardStatsProps) {

  const stats = useMemo(() => [
    { label: "Total Cases", value: casesCount, icon: FolderOpen },
    { label: "Active", value: activeCasesCount, icon: Clock },
    { label: "Analyses", value: "67", icon: FileText },
    { label: "Entities", value: "1,247", icon: Network },
  ], [casesCount, activeCasesCount])

  return (
    <div className="grid grid-cols-4 gap-4 mt-8">
      {stats.map((stat) => (
        <div key={stat.label} className="px-4 py-3 border border-border rounded-lg bg-card/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted/50">
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
