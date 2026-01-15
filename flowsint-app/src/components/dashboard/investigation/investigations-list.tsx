import { FolderOpen, MoreHorizontal, FileText, Network } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { Investigation } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { useMemo } from 'react'

interface InvestigationsListProps {
  investigations: Investigation[]
  view: 'grid' | 'list'
  filter: 'all' | 'active' | 'closed'
  setFilter: (filter: 'all' | 'active' | 'closed') => void
  casesCount: number
  activeCasesCount: number
  search: string
}

export function InvestigationsList({
  investigations,
  view,
  filter,
  setFilter,
  casesCount,
  activeCasesCount,
  search
}: InvestigationsListProps) {
  const filteredInvestigations = investigations.filter((inv) => {
    if (filter === 'all') return inv.name.toLowerCase().includes(search.toLowerCase())
    return inv.status === filter && inv.name.toLowerCase().includes(search.toLowerCase())
  })

  const filters = useMemo(
    () => [
      { label: 'All', value: 'all', count: casesCount },
      { label: 'Active', value: 'active', count: activeCasesCount },
      { label: 'Closed', value: 'closed', count: casesCount - activeCasesCount }
    ],
    [casesCount, activeCasesCount]
  )

  return (
    <div>
      <div className="flex items-center gap-1 mb-4">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as 'all' | 'active' | 'closed')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              filter === f.value
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      {view === 'list' ? (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-24">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-28">
                  Updated
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvestigations.length === 0 && (
                <div className="flex items-center justify-center p-4">
                  <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors group">
                    No investigation found.
                  </tr>
                </div>
              )}
              {filteredInvestigations.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/dashboard/investigations/$investigationId"
                      params={{ investigationId: inv.id }}
                      className="block"
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{inv.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {inv.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(inv.last_updated_at), {
                        addSuffix: true
                      })}
                    </span>
                  </td>
                  {/*<td className="px-4 py-3">
                    <button className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>*/}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filteredInvestigations.length === 0 && <div>No investigation found.</div>}
          {filteredInvestigations.map((inv) => (
            <Link
              to="/dashboard/investigations/$investigationId"
              params={{ investigationId: inv.id }}
              className="block p-4 border border-border rounded-lg hover:border-muted-foreground/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  <StatusBadge status={inv.status} />
                </div>
                {/*<button className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>*/}
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1 truncate">{inv.name}</h3>
              <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{inv.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Network className="w-3 h-3" /> {inv.sketches.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {inv.analyses.length}
                  </span>
                </div>
                {/* <div className="flex -space-x-1">
                  {inv.investigators.map((initials, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center"
                    >
                      <span className="text-[9px] font-medium text-muted-foreground">{initials}</span>
                    </div>
                  ))}
                </div> */}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs',
        status === 'active' && 'text-success',
        status === 'closed' && 'text-muted-foreground',
        status === 'on-hold' && 'text-warning'
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'active' && 'bg-success',
          status === 'closed' && 'bg-muted-foreground/50',
          status === 'on-hold' && 'bg-warning'
        )}
      />
      {status === 'on-hold' ? 'On Hold' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
