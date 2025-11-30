import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function InvestigationSkeleton() {
    return (
        <div className="h-full w-full px-4 py-12 bg-background overflow-auto">
            <div
                className="max-w-6xl mx-auto flex flex-col gap-12 items-center justify-start"
                style={{ containerType: 'inline-size' }}
            >
                {/* Recent Investigations Skeleton */}
                <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-9 w-28" />
                    </div>
                    <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
                        {[...Array(2)].map((_, i) => (
                            <Card key={i} className="p-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Get Started Section Skeleton */}
                <div className="w-full space-y-4">
                    <Skeleton className="h-7 w-48" />
                    <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i}>
                                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                    <Skeleton className="h-9 w-9 rounded-lg" />
                                    <Skeleton className="h-6 w-32" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-3/4" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Discover Section Skeleton */}
                <div className="w-full space-y-4">
                    <Skeleton className="h-7 w-48" />
                    <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
                        {[...Array(2)].map((_, i) => (
                            <Card key={i}>
                                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                    <Skeleton className="h-9 w-9 rounded-lg" />
                                    <Skeleton className="h-6 w-40" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-3/4" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Useful Resources Skeleton */}
                <div className="w-full space-y-4">
                    <Skeleton className="h-7 w-48" />
                    <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
                        {[...Array(2)].map((_, i) => (
                            <Card key={i}>
                                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                    <Skeleton className="h-9 w-9 rounded-lg" />
                                    <Skeleton className="h-6 w-40" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-3/4" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
