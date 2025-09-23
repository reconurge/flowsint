import { Skeleton } from '../ui/skeleton'

const AnalysisSkeleton = () => {
  return (
    <div className="flex flex-col gap-3 p-6">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div></div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export default AnalysisSkeleton
