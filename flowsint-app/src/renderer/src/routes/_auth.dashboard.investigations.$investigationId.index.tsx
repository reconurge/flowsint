import { createFileRoute } from '@tanstack/react-router'
import { investigationService } from '@/api/investigation-service'
import { Waypoints, PlusIcon, Users, FileText, Settings, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import NewSketch from '@/components/sketches/new-sketch'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { Sketch } from '@/types/sketch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId/')({
    loader: async ({ params: { investigationId } }) => {
        return {
            investigation: await investigationService.getById(investigationId),
        }
    },
    component: InvestigationPage,
})

function InvestigationPage() {
    const { investigation } = Route.useLoaderData()
    const hasSketches = investigation?.sketches?.length > 0

    // Get the most recent sketch update
    const mostRecentSketch = investigation.sketches?.sort((a, b) =>
        new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime()
    )[0]

    return (
        <div className="w-full h-full bg-background px-6 py-12 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold">{investigation.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            Created {formatDistanceToNow(new Date(investigation.created_at), { addSuffix: true })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>
                        <NewSketch noDropDown>
                            <Button size="sm">
                                <PlusIcon className="w-4 h-4 mr-2" />
                                New sketch
                            </Button>
                        </NewSketch>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
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
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {mostRecentSketch ? (
                                <>
                                    <div className="text-sm font-medium text-foreground line-clamp-1">
                                        {mostRecentSketch.title}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Updated {formatDistanceToNow(new Date(mostRecentSketch.last_updated_at), { addSuffix: true })}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="text-sm font-medium text-foreground">No recent activity</div>
                                    <p className="text-xs text-muted-foreground">
                                        Create your first sketch to get started
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
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
                                        'group p-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors',
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

                {/* Quick Actions */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                <div className="bg-blue-600/90 rounded-lg p-2">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <CardTitle className="text-lg">Export Investigation</CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground text-sm">
                                Export your investigation data and sketches for backup or sharing.
                            </CardContent>
                        </Card>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                <div className="bg-green-600/90 rounded-lg p-2">
                                    <Users className="w-5 h-5 text-white" />
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
        </div>
    )
}
