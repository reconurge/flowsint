import { investigationService } from '@/api/investigation-service'
import type { Investigation } from '@/types/investigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Sketch } from '@/types/sketch'
import NewInvestigation from './new-investigation'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { SkeletonList } from '../shared/skeleton-list'
import { useConfirm } from '@/components/use-confirm-dialog'
import { Home, FolderOpen, Search, Settings, Plus, ChevronDown } from "lucide-react"
import { toast } from 'sonner'
import { sketchService } from '@/api/sketch-service'
import { useState, useMemo } from 'react'
import { queryKeys } from '@/api/query-keys'
import { useMutation } from '@tanstack/react-query'
import ErrorState from '../shared/error-state'


const InvestigationList = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.investigations.list,
    queryFn: investigationService.get
  })
  const { confirm } = useConfirm()
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const filteredInvestigations = useMemo(() => {
    if (!data) return []
    if (!searchQuery.trim()) return data

    const query = searchQuery.toLowerCase().trim()
    return data.filter((investigation: Investigation) => {
      const matchesInvestigation = investigation.name.toLowerCase().includes(query)
      const matchesSketches = investigation.sketches?.some((sketch) =>
        sketch.title.toLowerCase().includes(query)
      )
      return matchesInvestigation || matchesSketches
    })
  }, [data, searchQuery])


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
      {/* Workspace selector */}
      {/* <div className="px-3 py-3">
        <button className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-sidebar-accent transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/80 flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
              F
            </div>
            <span className="text-sm font-medium text-sidebar-foreground">Flowsint</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <nav className="px-2 space-y-0.5">
        <Link to="/">
          <NavItem icon={Home} label="Home" active={true} />
        </Link>
        <NavItem icon={Search} label="Search" shortcut="⌘K" />
        <NavItem icon={Settings} label="Settings" />
      </nav> */}

      {/* Divider */}
      {/* <div className="mx-3 my-3 border-t border-sidebar-border" /> */}

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
          {filteredInvestigations.map((caseItem: Investigation) => (
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

function NavItem({
  icon: Icon,
  label,
  active,
  shortcut,
}: {
  icon: React.ElementType
  label: string
  active?: boolean
  shortcut?: string
}) {
  return (
    <div
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors cursor-pointer",
        active
          ? "bg-muted text-sidebar-foreground"
          : "text-muted-foreground hover:bg-muted/40 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="w-4 h-4 opacity-60" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <span className="text-[10px] text-muted-foreground/60">{shortcut}</span>}
    </div>
  )
}