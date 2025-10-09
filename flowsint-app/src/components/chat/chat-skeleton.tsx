import { Skeleton } from '../ui/skeleton'

export function ChatSkeleton() {
  return (
    <div className="grow p-4 flex flex-col gap-4">
      {/* User message skeleton */}
      <div className="flex w-full justify-end">
        <div className="bg-muted-foreground/5 max-w-[80%] p-3 rounded-md">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>

      {/* Bot message skeleton */}
      <div className="flex w-full">
        <div className="w-full p-3 rounded-md">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>

      {/* Another user message skeleton */}
      <div className="flex w-full justify-end">
        <div className="bg-muted-foreground/5 max-w-[80%] p-3 rounded-md">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>

      {/* Another bot message skeleton */}
      <div className="flex w-full">
        <div className="w-full p-3 rounded-md">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
}
