import { createFileRoute } from '@tanstack/react-router'
import { investigationService } from '@/api/investigation-service'
import { analysisService } from '@/api/analysis-service'
import { Waypoints, PlusIcon, Users, FileText, Settings, Activity, FileText as FileTextIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import NewSketch from '@/components/sketches/new-sketch'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { Sketch } from '@/types/sketch'
import type { Analysis } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalysisPanelStore } from '@/stores/analysis-panel-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useQuery } from '@tanstack/react-query'

function InvestigationSkeleton() {
    return (
        <div className="w-full h-full bg-background overflow-y-auto">
            <div className="max-w-7xl mx-auto p-8 space-y-8">
                {/* Header Section Skeleton */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-28" />
                    </div>
                </div>

                {/* Overview Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-12 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Sketches Section Skeleton */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-5 w-16" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-12 ml-auto" />
                                    </div>
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-3/4" />
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-3 w-3" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Analyses Section Skeleton */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-5 w-16" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-12 ml-auto" />
                                    </div>
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-3/4" />
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-3 w-3" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions Skeleton */}
                <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(2)].map((_, i) => (
                            <Card key={i} className="hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                    <Skeleton className="h-9 w-9 rounded-lg" />
                                    <Skeleton className="h-6 w-40" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-full" />
                                </CardContent>
                            </Card>
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
    const isOpenChat = useLayoutStore(s => s.isOpenChat)
    const { data: analyses, isLoading: isLoadingAnalyses } = useQuery<Analysis[]>({
        queryKey: ['analyses', investigation.id],
        queryFn: () => analysisService.getByInvestigationId(investigation.id),
    })
    const hasSketches = investigation?.sketches?.length > 0
    const hasAnalyses = analyses && analyses.length > 0
    const setCurrentAnalysisId = useAnalysisPanelStore(s => s.setCurrentAnalysisId)
    const openChat = useLayoutStore(s => s.openChat)

    // Get the most recent sketch update
    const mostRecentSketch = investigation.sketches?.sort((a, b) =>
        new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime()
    )[0]

    // Get the most recent analysis update
    const mostRecentAnalysis = analyses?.sort((a, b) =>
        new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime()
    )[0]

    const handleAnalysisClick = (analysisId: string) => {
        setCurrentAnalysisId(analysisId)
        openChat()
    }

    // Get the most recent activity between sketches and analyses
    const getMostRecentActivity = () => {
        if (!mostRecentSketch && !mostRecentAnalysis) return null
        if (!mostRecentSketch) return mostRecentAnalysis
        if (!mostRecentAnalysis) return mostRecentSketch

        return new Date(mostRecentSketch.last_updated_at) > new Date(mostRecentAnalysis.last_updated_at)
            ? mostRecentSketch
            : mostRecentAnalysis
    }

    const mostRecentActivity = getMostRecentActivity()

    return (
        <div className="w-full h-full bg-background overflow-y-auto">
            {/* Hero Section */}
            <div className={cn("border-b border-border z-10", isOpenChat ? "bg-background" : "bg-gradient-to-r from-secondary/10 to-primary/10")}>
                <div className="max-w-7xl mx-auto p-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-foreground">{investigation.name}</h1>
                            <p className="text-muted-foreground">
                                Created {formatDistanceToNow(new Date(investigation.created_at), { addSuffix: true })}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </Button>
                            <NewSketch>
                                <Button size="sm">
                                    <PlusIcon className="w-4 h-4 mr-2" />
                                    New
                                </Button>
                            </NewSketch>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-8 space-y-8">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Sketches</CardTitle>
                            <Waypoints className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{investigation.sketches?.length || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                {hasSketches ? 'Active investigation' : 'No sketches yet'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
                            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {isLoadingAnalyses ? (
                                <>
                                    <Skeleton className="h-8 w-12 mb-2" />
                                    <Skeleton className="h-3 w-32" />
                                </>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">{analyses?.length || 0}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {hasAnalyses ? 'Active investigation' : 'No analyses yet'}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {mostRecentActivity ? (
                                <>
                                    <div className="text-sm font-medium text-foreground line-clamp-1">
                                        {mostRecentActivity.title}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Updated {formatDistanceToNow(new Date(mostRecentActivity.last_updated_at), { addSuffix: true })}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="text-sm font-medium text-foreground">No recent activity</div>
                                    <p className="text-xs text-muted-foreground">
                                        Create your first sketch or analysis to get started
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Collaborators</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">1</div>
                            <p className="text-xs text-muted-foreground">
                                You are the owner
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Sketches Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Sketches</h2>
                        <Badge variant="outline" className="text-xs">
                            {investigation.sketches?.length || 0} total
                        </Badge>
                    </div>

                    {!hasSketches ? (
                        <div className="flex flex-col items-center justify-center text-center gap-4 p-8 border border-dashed rounded-xl">
                            <Waypoints className="w-10 h-10 text-yellow-500" />
                            <div className="space-y-1 max-w-md">
                                <h3 className="text-lg font-semibold text-foreground">
                                    No sketches yet
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Start by creating a sketch to organize entities and visualize your investigation.
                                </p>
                            </div>
                            <NewSketch noDropDown>
                                <Button>
                                    <PlusIcon className="w-4 h-4 mr-2" />
                                    Create sketch
                                </Button>
                            </NewSketch>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {investigation.sketches.map((sketch: Sketch) => (
                                <Link
                                    key={sketch.id}
                                    to="/dashboard/investigations/$investigationId/$type/$id"
                                    params={{
                                        investigationId: investigation.id,
                                        type: 'graph',
                                        id: sketch.id,
                                    }}
                                    className={cn(
                                        'group p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all',
                                        'flex flex-col justify-between h-full'
                                    )}
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <Waypoints className="w-4 h-4 text-yellow-500" />
                                            {sketch.title}
                                            <Badge variant="outline" className="text-[10px] py-0.5 px-1 ml-auto">SKETCH</Badge>
                                        </div>
                                        {sketch.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {sketch.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Activity className="w-3 h-3" />
                                            <span>Last updated {formatDistanceToNow(new Date(sketch.last_updated_at), { addSuffix: true })}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Analyses Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Analyses</h2>
                        {isLoadingAnalyses ? (
                            <Skeleton className="h-5 w-16" />
                        ) : (
                            <Badge variant="outline" className="text-xs">
                                {analyses?.length || 0} total
                            </Badge>
                        )}
                    </div>

                    {isLoadingAnalyses ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-4 w-4" />
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-4 w-12 ml-auto" />
                                        </div>
                                        <Skeleton className="h-3 w-full" />
                                        <Skeleton className="h-3 w-3/4" />
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-3 w-3" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !hasAnalyses ? (
                        <div className="flex flex-col items-center justify-center text-center gap-4 p-8 border border-dashed rounded-xl">
                            <FileTextIcon className="w-10 h-10 opacity-60" />
                            <div className="space-y-1 max-w-md">
                                <h3 className="text-lg font-semibold text-foreground">
                                    No analyses yet
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Start by creating an analysis to document your findings and insights.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {analyses?.map((analysis) => (
                                <Link
                                    key={analysis.id}
                                    to="/dashboard/investigations/$investigationId/$type/$id"
                                    params={{
                                        investigationId: investigation.id,
                                        type: 'analysis',
                                        id: analysis.id,
                                    }}
                                    className={cn(
                                        'group p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all cursor-pointer',
                                        'flex flex-col justify-between h-full'
                                    )}
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <FileTextIcon className="w-4 h-4 text-blue-500" />
                                            {analysis.title || 'Untitled Analysis'}
                                            <Badge variant="outline" className="text-[10px] py-0.5 px-1 ml-auto">ANALYSIS</Badge>
                                        </div>
                                        {analysis.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {analysis.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Activity className="w-3 h-3" />
                                            <span>Last updated {formatDistanceToNow(new Date(analysis.last_updated_at), { addSuffix: true })}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="hover:shadow-md transition-all cursor-pointer">
                            <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                <div className="bg-blue-600/20 rounded-lg p-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <CardTitle className="text-lg">Export Investigation</CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground text-sm">
                                Export your investigation data and sketches for backup or sharing.
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-all cursor-pointer">
                            <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                <div className="bg-green-600/20 rounded-lg p-2">
                                    <Users className="w-5 h-5 text-green-600" />
                                </div>
                                <CardTitle className="text-lg">Share Investigation</CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground text-sm">
                                Invite team members to collaborate on this investigation.
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div >
    )
}
