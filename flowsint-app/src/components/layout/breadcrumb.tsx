import { useLocation, useParams } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { investigationService } from '@/api/investigation-service'
import { sketchService } from '@/api/sketch-service'
import { Skeleton } from '@/components/ui/skeleton'
import { Home } from 'lucide-react'
import { flowService } from '@/api/flow-service'

export function PathBreadcrumb() {
  const { investigationId, id, type, flowId } = useParams({ strict: false })
  const location = useLocation()

  const { data: investigation, isLoading: isInvestigationLoading } = useQuery({
    queryKey: ['investigation', investigationId],
    queryFn: () => investigationService.getById(investigationId!),
    enabled: !!investigationId
  })

  const { data: sketch, isLoading: isSketchLoading } = useQuery({
    queryKey: ['sketch', id],
    queryFn: () => sketchService.getById(id!),
    enabled: !!id && type === 'graph'
  })

  const { data: flow, isLoading: isFlowLoading } = useQuery({
    queryKey: ['flow', flowId],
    queryFn: () => flowService.getById(flowId!),
    enabled: !!flowId
  })

  const isFlowPage = location.pathname.includes('/flows')

  return (
    <div className="w-full overflow-hidden">
      <Breadcrumb className="w-full">
        <BreadcrumbList className="flex items-center justify-start gap-1 min-w-0">
          <BreadcrumbItem className="shrink-0">
            <BreadcrumbLink asChild>
              <Link to="/dashboard" className="truncate font-medium">
                <Home className="h-4 w-4 opacity-60" strokeWidth={1.4} />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {isFlowPage ? (
            <>
              <BreadcrumbSeparator className="shrink-0" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbLink asChild>
                  <Link to="/dashboard/flows" className="truncate block font-medium">
                    Flows
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {flowId && (
                <>
                  <BreadcrumbSeparator className="shrink-0" />
                  <BreadcrumbItem className="min-w-0 flex-1">
                    <BreadcrumbPage className="truncate block text-muted-foreground">
                      {isFlowLoading ? (
                        <Skeleton className="h-4 w-24" />
                      ) : (
                        flow?.name || '(Unnamed flow)'
                      )}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </>
          ) : (
            investigationId && (
              <>
                <BreadcrumbSeparator className="shrink-0" />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbLink asChild>
                    <Link
                      to="/dashboard/investigations/$investigationId"
                      params={{ investigationId: investigationId! }}
                      className="truncate block font-medium"
                    >
                      {isInvestigationLoading ? (
                        <Skeleton className="h-4 w-24" />
                      ) : (
                        investigation?.name
                      )}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {type && id && (
                  <>
                    <BreadcrumbSeparator className="shrink-0" />
                    <BreadcrumbItem className="min-w-0 flex-1">
                      <BreadcrumbPage className="truncate block text-muted-foreground">
                        {type === 'graph' ? (
                          isSketchLoading ? (
                            <Skeleton className="h-4 w-24" />
                          ) : (
                            sketch?.title
                          )
                        ) : (
                          type
                        )}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </>
            )
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
