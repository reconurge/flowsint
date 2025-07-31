import { createFileRoute } from '@tanstack/react-router'
import { investigationService } from '@/api/investigation-service'
import { InvestigationSketches } from '@/components/dashboard/investigation-sketches'
import { InvestigationAnalyses } from '@/components/dashboard/investigation-analyses'

function InvestigationSkeleton() {
    return (
        <div className="h-full w-full bg-background overflow-y-auto">
            <div className="max-w-7xl mx-auto p-8 space-y-12" style={{ containerType: 'inline-size' }}>
                {/* Investigation Cards Skeleton */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-muted rounded animate-pulse" />
                            <div className="w-48 h-6 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-8 bg-muted rounded animate-pulse" />
                            <div className="w-32 h-8 bg-muted rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="w-full h-32 bg-muted rounded-lg animate-pulse" />
                        ))}
                    </div>
                </div>

                {/* Analysis Cards Skeleton */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-muted rounded animate-pulse" />
                            <div className="w-48 h-6 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-8 bg-muted rounded animate-pulse" />
                            <div className="w-32 h-8 bg-muted rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 cq-sm:grid-cols-2 cq-md:grid-cols-3 cq-lg:grid-cols-4 cq-xl:grid-cols-5 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="w-full h-32 bg-muted rounded-lg animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId/')({
    loader: async ({ params: { investigationId } }) => {
        return {
            investigation: await investigationService.getById(investigationId),
        }
    },
    component: InvestigationPage,
    pendingComponent: InvestigationSkeleton,
})

function InvestigationPage() {
    const { investigation } = Route.useLoaderData()

    return (
        <div className="h-full w-full bg-background overflow-y-auto">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-8 space-y-12" style={{ containerType: 'inline-size' }}>
                {/* Investigation Sketches */}
                <InvestigationSketches title={investigation.name} investigationId={investigation.id} />

                {/* Investigation Analyses */}
                <InvestigationAnalyses investigationId={investigation.id} />
            </div>
        </div>
    );
}
