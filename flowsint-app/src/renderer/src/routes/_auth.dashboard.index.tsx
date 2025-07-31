import { createFileRoute } from '@tanstack/react-router';
import { InvestigationSkeleton } from '@/components/dashboard/investigation-skeleton';
import { InvestigationCards } from '@/components/dashboard/investigation-cards';
// import { AnalysisCards } from '@/components/dashboard/analysis-cards';

export const Route = createFileRoute('/_auth/dashboard/')({
    component: DashboardPage,
    pendingComponent: InvestigationSkeleton,
});



function DashboardPage() {
    return (
        <div className="h-full w-full bg-background overflow-y-auto">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-8 space-y-12" style={{ containerType: 'inline-size' }}>
                {/* Investigation Cards */}
                <InvestigationCards />
                
                {/* Analysis Cards */}
                {/* <AnalysisCards /> */}
            </div>
        </div>
    );
}
