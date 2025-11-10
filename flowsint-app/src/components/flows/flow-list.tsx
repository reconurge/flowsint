import { flowService } from '@/api/flow-service'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { SkeletonList } from '../shared/skeleton-list'
import { Input } from '../ui/input'
import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Pencil, PlusIcon } from 'lucide-react'
import { Button } from '../ui/button'
import NewFlow from './new-flow'
import ErrorState from '../shared/error-state'
import { Flow } from '@/types'

const FlowsList = () => {
  const {
    data: flows,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flowService.get()
  })
  const [searchQuery, setSearchQuery] = useState('')

  const filteredflows = useMemo(() => {
    if (!flows) return []
    if (!searchQuery.trim()) return flows

    const query = searchQuery.toLowerCase().trim()
    return flows.filter((flow: Flow) => {
      const matchesName = flow.name?.toLowerCase().includes(query)
      const matchesCategory = flow.category
        ? Array.isArray(flow.category)
          ? flow.category.some((cat) => cat.toLowerCase().includes(query))
          : flow.category.toLowerCase().includes(query)
        : false
      return matchesName || matchesCategory
    })
  }, [flows, searchQuery])

  if (isLoading)
    return (
      <div className="p-2">
        <SkeletonList rowCount={10} />
      </div>
    )
  if (error)
    return (
      <ErrorState
        title="Couldn't load flows"
        description="Something went wrong while fetching data. Please try again."
        error={error}
        onRetry={() => refetch()}
      />
    )

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-card">
      <div className="p-2 border-b flex items-center gap-1">
        <NewFlow>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </NewFlow>
        <Input
          type="search"
          className="h-7"
          placeholder="Search flows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredflows.length > 0 ? (
        <ul className="flex-1 overflow-auto divide-y">
          {filteredflows.map((flow: any) => (
            <li key={flow.id}>
              <Link
                to={`/dashboard/flows/$flowId`}
                params={{ flowId: flow.id }}
                className="block px-4 py-3 hover:bg-muted cursor-pointer"
                title={flow.description || 'No description'}
              >
                <div className="font-semibold text-sm truncate">
                  {flow.name || '(Unnamed flow)'}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {flow.category && (
                    <span className="truncate">
                      {Array.isArray(flow.category) ? flow.category.join(', ') : flow.category}
                    </span>
                  )}
                  {flow.last_updated_at && (
                    <>
                      {Boolean(flow.category.length) && <span>•</span>}
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <Pencil className="h-3 w-3" />
                        {formatDistanceToNow(new Date(flow.last_updated_at), { addSuffix: true })}
                      </div>
                    </>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4 text-center text-muted-foreground">
          {searchQuery ? 'No matching flows found' : 'No flows found'}
        </div>
      )}
    </div>
  )
}

export default FlowsList
