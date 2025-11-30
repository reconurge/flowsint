import { investigationService } from '@/api/investigation-service'
import type { Investigation } from '@/types/investigation'
import { useQuery } from '@tanstack/react-query'
import NewInvestigation from './new-investigation'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { SkeletonList } from '../shared/skeleton-list'
import { FolderOpen, Plus } from "lucide-react"
import { queryKeys } from '@/api/query-keys'
import ErrorState from '../shared/error-state'


const InvestigationList = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.investigations.list,
    queryFn: investigationService.get
  })

  if (isLoading)
    return (
      <SkeletonList rowCount={6} />
    )
  if (error)
    return (
      <ErrorState
        title="Couldn't load investigations"
        description="Something went wrong while fetching data. Please try again."
        error={error}
        onRetry={() => refetch()}
      />
    )
  return (
    <div className="w-full h-full bg-card flex flex-col overflow-hidden">
      <div className="px-2 my-2 flex-1 overflow-auto">
        <div className="flex items-center justify-between px-2 mb-1 group">
          <span className="text-xs font-medium text-muted-foreground">Cases</span>
          <NewInvestigation noDropDown>
            <button className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </NewInvestigation>
        </div>
        <div className="mx-1 my-1 border-t border-sidebar-border/30" />
        <div className="space-y-0.5">
          {data.map((caseItem: Investigation) => (
            <Link
              to="/dashboard/investigations/$investigationId"
              params={{
                investigationId: caseItem.id
              }}
            >
              <button
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left group",
                  "text-muted-foreground hover:bg-muted hover:text-sidebar-foreground"
                )}
              >
                <FolderOpen className="w-4 h-4 shrink-0 opacity-60" />
                <span className="truncate flex-1">{caseItem.name}</span>
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    caseItem.status === "active" && "bg-success",
                    caseItem.status === "closed" && "bg-muted-foreground/50",
                    caseItem.status === "on-hold" && "bg-warning",
                  )}
                />
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div >
  )
}

export default InvestigationList