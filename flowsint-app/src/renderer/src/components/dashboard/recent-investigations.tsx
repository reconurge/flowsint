import { PlusCircle } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { investigationService } from '@/api/investigation-service'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorState from '@/components/shared/error-state'

function LoadingSkeleton() {
  return (
    <div className="w-full mt-2">
      <Skeleton className="h-7 w-48 mb-2" />
      <div className="border-b border-border mb-2" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecentInvestigations() {
  const {
    data: investigations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['recent-investigations'],
    queryFn: () => investigationService.get()
  })

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load recent investigations"
        description="Something went wrong while fetching data. Please try again."
        error={error}
        onRetry={() => refetch()}
      />
    )
  }

  if (!investigations?.length) {
    return (
      <div className="w-full mt-2">
        <h2 className="text-xl font-bold mb-2 text-foreground">Recent investigations</h2>
        <div className="border-b border-border mb-2" />
        <div className="flex items-center gap-3 px-2 py-3">
          <span className="bg-muted rounded-full p-2">
            <PlusCircle className="w-5 h-5 text-muted-foreground" />
          </span>
          <span className="text-foreground font-medium">No recent investigations</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full mt-2">
      <h2 className="text-xl font-bold mb-2 text-foreground">
        Recent investigations ({investigations.length})
      </h2>
      <div className="border-b border-border mb-2" />
      <div className="flex flex-col gap-2">
        {investigations.slice(0, 5).map((investigation) => (
          <Link
            key={investigation.id}
            to="/dashboard/investigations/$investigationId"
            params={{ investigationId: investigation.id }}
            className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="bg-muted rounded-lg p-2">
                <PlusCircle className="w-4 h-4 text-muted-foreground" />
              </span>
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{investigation.name}</span>
                <span className="text-sm text-muted-foreground">
                  Updated{' '}
                  {formatDistanceToNow(new Date(investigation.last_updated_at), {
                    addSuffix: true
                  })}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              Open
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
