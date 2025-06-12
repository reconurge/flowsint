import { createFileRoute } from '@tanstack/react-router'
import { DiscoverSection } from '@/components/dashboard/discover-section'
import { GetStartedSection } from '@/components/dashboard/get-started-section'
import { RecentInvestigations } from '@/components/dashboard/recent-investigations'
import { UsefulResources } from '@/components/dashboard/useful-resources'
import { InvestigationSkeleton } from '@/components/dashboard/investigation-skeleton'
import { PlusIcon, Waypoints, FileText, Users, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import NewInvestigation from '@/components/investigations/new-investigation'

export const Route = createFileRoute('/_auth/dashboard/investigations/')({
    component: InvestigationPage,
    pendingComponent: InvestigationSkeleton,
})

function InvestigationPage() {
    return (
        <div className="w-full h-full bg-background overflow-y-auto">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-secondary/10 to-primary/10 border-b border-border z-10">
                <div className="max-w-7xl mx-auto p-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-foreground">Investigations</h1>
                            <p className="text-muted-foreground">
                                Manage and organize your investigations.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <NewInvestigation noDropDown>
                                <div>
                                    <Button size="sm">
                                        <PlusIcon className="w-4 h-4 mr-2" />
                                        New Investigation
                                    </Button>
                                </div>
                            </NewInvestigation>
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
                            <CardTitle className="text-sm font-medium">Total Investigations</CardTitle>
                            <Waypoints className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">12</div>
                            <p className="text-xs text-muted-foreground">
                                Active investigations
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Sketches</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">48</div>
                            <p className="text-xs text-muted-foreground">
                                Across all investigations
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium text-foreground line-clamp-1">
                                Updated Investigation #123
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Updated 2 hours ago
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Collaborators</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">3</div>
                            <p className="text-xs text-muted-foreground">
                                Active team members
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className='flex flex-col gap-12 items-center justify-start'>
                    <RecentInvestigations />
                    <GetStartedSection />
                    <DiscoverSection />
                    <UsefulResources />
                </div>
            </div>
        </div>
    )
}
