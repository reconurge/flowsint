import { useLocation, useParams } from "@tanstack/react-router"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { investigationService } from "@/api/investigation-service"
import { sketchService } from "@/api/sketch-service"
import { transformService } from "@/api/transfrom-service"
import { Skeleton } from "@/components/ui/skeleton"
import { Home } from "lucide-react"

export function PathBreadcrumb() {
    const { investigationId, id, type, transformId } = useParams({ strict: false })
    const location = useLocation()

    const { data: investigation, isLoading: isInvestigationLoading } = useQuery({
        queryKey: ["investigation", investigationId],
        queryFn: () => investigationService.getById(investigationId!),
        enabled: !!investigationId,
    })

    const { data: sketch, isLoading: isSketchLoading } = useQuery({
        queryKey: ["sketch", id],
        queryFn: () => sketchService.getById(id!),
        enabled: !!id && type === "graph",
    })

    const { data: transform, isLoading: isTransformLoading } = useQuery({
        queryKey: ["transform", transformId],
        queryFn: () => transformService.getById(transformId!),
        enabled: !!transformId,
    })

    const isTransformsPage = location.pathname.includes('/transforms')

    return (
        <div className="w-full overflow-hidden">
            <Breadcrumb className="w-full">
                <BreadcrumbList className="flex items-center justify-start gap-1 min-w-0">
                    <BreadcrumbItem className="flex-shrink-0">
                        <BreadcrumbLink asChild>
                            <Link to="/dashboard" className="truncate font-medium">
                                <Home className="h-4 w-4 opacity-60" strokeWidth={1.4} />
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    {isTransformsPage ? (
                        <>
                            <BreadcrumbSeparator className="flex-shrink-0" />
                            <BreadcrumbItem className="min-w-0">
                                <BreadcrumbLink asChild>
                                    <Link to="/dashboard/transforms" className="truncate block font-medium">
                                        Transforms
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            {transformId && (
                                <>
                                    <BreadcrumbSeparator className="flex-shrink-0" />
                                    <BreadcrumbItem className="min-w-0 flex-1">
                                        <BreadcrumbPage className="truncate block text-muted-foreground">
                                            {isTransformLoading ? (
                                                <Skeleton className="h-4 w-24" />
                                            ) : (
                                                transform?.name || "(Unnamed transform)"
                                            )}
                                        </BreadcrumbPage>
                                    </BreadcrumbItem>
                                </>
                            )}
                        </>
                    ) : investigationId && (
                        <>
                            <BreadcrumbSeparator className="flex-shrink-0" />
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
                                    <BreadcrumbSeparator className="flex-shrink-0" />
                                    <BreadcrumbItem className="min-w-0 flex-1">
                                        <BreadcrumbPage className="truncate block text-muted-foreground">
                                            {type === "graph" ? (
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
                    )}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    )
} 
