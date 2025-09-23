import { cn } from '@/lib/utils'
import { Skeleton } from '../ui/skeleton'
import { Card, CardContent, CardHeader } from '../ui/card'

interface SkeletonListProps {
  rowCount: number
  className?: string
  mode?: 'list' | 'card'
}

export function SkeletonList({ rowCount, className, mode = 'list' }: SkeletonListProps) {
  if (mode === 'card') {
    return (
      <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-6">
        {Array.from({ length: rowCount }).map((_, i) => (
          <Card key={i} className="group">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-4" />
              </div>
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-3/4 mt-1" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Skeleton className="h-4 w-4 mr-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                {/* <div className="flex gap-2">
                                    <Skeleton className="h-5 w-16" />
                                    <Skeleton className="h-5 w-16" />
                                </div> */}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <ul role="list" className="space-y-1">
      {Array.from({ length: rowCount }).map((_, i) => (
        <Skeleton key={i} className={cn('h-7 w-full rounded-none', className)} />
      ))}
    </ul>
  )
}
