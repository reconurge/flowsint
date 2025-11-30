"use client"

import { useState } from "react"
import { DashboardHeader } from "./dashboard-header"
import { DashboardStats } from "./dashboard-stats"
import { InvestigationsList } from "./investigations-list"
import { RecentActivity } from "./recent-activity"
import { queryKeys } from "@/api/query-keys"
import { useQuery } from "@tanstack/react-query"
import { investigationService } from "@/api/investigation-service"
import { Investigation } from "@/types"
import { InvestigationSkeleton } from "./investigation-skeleton"

export function DashboardPage() {
  const [view, setView] = useState<"grid" | "list">("list")
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all")

  const {
    data: investigations,
    isLoading,
    // error,
    // refetch
  } = useQuery({
    queryKey: queryKeys.investigations.dashboard,
    queryFn: investigationService.get,
  })

  if (isLoading) {
    return <InvestigationSkeleton />
  }

  const casesCount = investigations.length ?? 0 as number
  const activeCasesCount = investigations.filter((i: Investigation) => i.status === "active").length ?? 0 as number

  return (
    <main className="flex-1 h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <DashboardHeader view={view} setView={setView} />
        <DashboardStats casesCount={casesCount} activeCasesCount={activeCasesCount} />
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <InvestigationsList casesCount={casesCount} activeCasesCount={activeCasesCount} investigations={investigations} view={view} filter={filter} setFilter={setFilter} />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>
      </div>
    </main>
  )
}
