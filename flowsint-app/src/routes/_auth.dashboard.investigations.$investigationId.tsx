import { createFileRoute, Outlet } from '@tanstack/react-router'
import { investigationService } from '@/api/investigation-service'

function InvestigationSkeleton() {
  return (
    <div className="h-full w-full bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="space-y-4">
          <div className="w-64 h-8 bg-muted rounded animate-pulse" />
          <div className="w-96 h-4 bg-muted rounded animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="w-20 h-6 bg-muted rounded animate-pulse" />
            <div className="w-24 h-6 bg-muted rounded animate-pulse" />
            <div className="w-32 h-6 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId')({
  loader: async ({ params: { investigationId } }) => {
    const investigation = await investigationService.getById(investigationId)
    return { investigation }
  },
  component: () => <Outlet />,
  pendingComponent: InvestigationSkeleton
})
