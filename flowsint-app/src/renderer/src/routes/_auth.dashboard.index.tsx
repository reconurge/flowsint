import { createFileRoute } from '@tanstack/react-router';
import { GetStartedSection } from '@/components/dashboard/get-started-section';
import { RecentInvestigations } from '@/components/dashboard/recent-investigations';
import { DiscoverSection } from '@/components/dashboard/discover-section';
import { UsefulResources } from '@/components/dashboard/useful-resources';
import { InvestigationSkeleton } from '@/components/dashboard/investigation-skeleton';
import { Card } from '@/components/ui/card';
import { Activity, BarChart3, Clock, FileText, PlusIcon } from 'lucide-react';
import NewInvestigation from '@/components/investigations/new-investigation';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { investigationService } from '@/api/investigation-service';
import { analysisService } from '@/api/analysis-service';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/_auth/dashboard/')({
    component: DashboardPage,
    pendingComponent: InvestigationSkeleton,
});

function DashboardStats() {
    const { data: investigations = [], isLoading: isLoadingInvestigations } = useQuery({
        queryKey: ['dashboard-stats-investigations'],
        queryFn: () => investigationService.get(),
    });

    const { data: allAnalyses = [], isLoading: isLoadingAnalyses } = useQuery({
        queryKey: ['dashboard-stats-analyses'],
        queryFn: () => analysisService.get(),
    });

    if (isLoadingInvestigations || isLoadingAnalyses) {
        return (
            <div className="grid grid-cols-1 @xs:grid-cols-1 @sm:grid-cols-1 @md:grid-cols-2 @lg:grid-cols-2 @xl:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="p-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-9 h-9 rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-8" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    // Calculate stats based on investigation status
    const activeInvestigations = investigations.filter(inv => inv.status === 'active').length;
    const completedInvestigations = investigations.filter(inv => inv.status === 'completed').length;
    const inProgressInvestigations = investigations.filter(inv => inv.status === 'in_progress').length;
    const totalAnalyses = allAnalyses.length;

    return (
        <div className="grid grid-cols-1 @xs:grid-cols-1 @sm:grid-cols-1 @md:grid-cols-2 @lg:grid-cols-2 @xl:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                    <div className="bg-muted rounded-lg p-2">
                        <Activity className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Active Investigations</p>
                        <p className="text-2xl font-bold">{activeInvestigations}</p>
                    </div>
                </div>
            </Card>
            <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                    <div className="bg-muted rounded-lg p-2">
                        <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-2xl font-bold">{completedInvestigations}</p>
                    </div>
                </div>
            </Card>
            <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                    <div className="bg-muted rounded-lg p-2">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">In Progress</p>
                        <p className="text-2xl font-bold">{inProgressInvestigations}</p>
                    </div>
                </div>
            </Card>
            <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                    <div className="bg-muted rounded-lg p-2">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Analyses</p>
                        <p className="text-2xl font-bold">{totalAnalyses}</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}

function DashboardPage() {
    return (
        <div className="h-full w-full bg-background overflow-y-auto">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-secondary/10 to-primary/10 border-b border-border z-10">
                <div className="max-w-7xl mx-auto p-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
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
            <div className="max-w-7xl @container mx-auto p-8">
                {/* Quick Stats */}
                <DashboardStats />

                {/* Main Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Recent Investigations */}
                    <div className="lg:col-span-2 space-y-8">
                        <RecentInvestigations />
                        <DiscoverSection />
                    </div>

                    {/* Right Column - Quick Actions & Resources */}
                    <div className="space-y-8">
                        <GetStartedSection />
                        <UsefulResources />
                    </div>
                </div>
            </div>
        </div>
    );
}
