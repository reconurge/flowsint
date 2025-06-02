import { createFileRoute } from '@tanstack/react-router';
import { GetStartedSection } from '@/components/dashboard/get-started-section';
import { RecentInvestigations } from '@/components/dashboard/recent-investigations';
import { DiscoverSection } from '@/components/dashboard/discover-section';
import { UsefulResources } from '@/components/dashboard/useful-resources';
import { InvestigationSkeleton } from '@/components/dashboard/investigation-skeleton';

export const Route = createFileRoute('/_auth/dashboard/')({
    component: DashboardPage,
    pendingComponent: InvestigationSkeleton,
});

function DashboardPage() {
    return (
        <div className="h-full w-full px-4 py-12 bg-background overflow-auto">
            <div className='max-w-4xl mx-auto flex flex-col gap-12 items-center justify-start'>
                <GetStartedSection />
                <RecentInvestigations />
                <DiscoverSection />
                <UsefulResources />
            </div>
        </div>
    );
}
