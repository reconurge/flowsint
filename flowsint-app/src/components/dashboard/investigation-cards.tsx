import { useQuery } from '@tanstack/react-query'
import { investigationService } from '@/api/investigation-service'
import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FolderOpen, Plus, Clock, FileText, BarChart3, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import NewInvestigation from '@/components/investigations/new-investigation'
import { queryKeys } from '@/api/query-keys'
import ErrorState from '@/components/shared/error-state'

interface InvestigationCardProps {
  investigation: any
}

function InvestigationCard({ investigation }: InvestigationCardProps) {
  const sketchCount = investigation.sketches?.length || 0
  const analysisCount = investigation.analyses?.length || 0
  const totalItems = sketchCount + analysisCount

  return (
    <Link
      to="/dashboard/investigations/$investigationId"
      params={{ investigationId: investigation.id }}
      className="block"
    >
      <Card className="hover:shadow-lg py-4 transition-all duration-200 cursor-pointer group border hover:border-primary/20">
        <CardContent className="h-full flex flex-col">
          {/* Header with title and count */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {investigation.name}
                </h3>
                <p className="text-xs text-muted-foreground">{totalItems} items</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">
              {totalItems}
            </Badge>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              <span>{sketchCount} graphs</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{analysisCount} docs</span>
            </div>
          </div>

          {/* Footer with timestamp */}
          <div className="mt-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                Updated{' '}
                {formatDistanceToNow(new Date(investigation.last_updated_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function InvestigationCardsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="w-full">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="flex gap-4 mb-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="mt-auto">
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function InvestigationCards() {
  const {
    data: investigations,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: queryKeys.investigations.dashboard,
    queryFn: investigationService.get,
  })

  if (isLoading) {
    return <InvestigationCardsSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Investigations</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Investigation
            </Button>
          </div>
        </div>
        <ErrorState
          title="Couldn't load investigations"
          description="Something went wrong while fetching data. Please try again."
          error={error}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  if (!investigations || investigations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Investigations</h2>
          </div>
          <NewInvestigation noDropDown>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Investigation
            </Button>
          </NewInvestigation>
        </div>

        {/* Compact dashed card empty state */}
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="w-full flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-base font-medium">No investigations yet</div>
              <div className="text-sm text-muted-foreground max-w-md">
                Create an investigation to group graphs and analyses by case or topic.
              </div>
              <NewInvestigation noDropDown>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create investigation
                </Button>
              </NewInvestigation>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Investigations</h2>
          <span className="text-sm text-muted-foreground">
            {investigations.length} investigations
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NewInvestigation noDropDown>
            <Button size="sm" data-tour-id="create-investigation">
              <Plus className="w-4 h-4 mr-2" />
              New Investigation
            </Button>
          </NewInvestigation>
        </div>
      </div>

      <div className="grid grid-cols-1 cq-xs:grid-cols-2 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4" data-tour-id="investigation-list">
        {investigations.slice(0, 8).map((investigation: any) => (
          <InvestigationCard key={investigation.id} investigation={investigation} />
        ))}
      </div>
    </div>
  )
}
