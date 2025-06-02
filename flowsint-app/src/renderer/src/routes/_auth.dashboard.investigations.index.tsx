import { createFileRoute } from '@tanstack/react-router'
import { DiscoverSection } from '@/components/dashboard/discover-section'
import { GetStartedSection } from '@/components/dashboard/get-started-section'
import { RecentInvestigations } from '@/components/dashboard/recent-investigations'
import { UsefulResources } from '@/components/dashboard/useful-resources'
import { InvestigationSkeleton } from '@/components/dashboard/investigation-skeleton'

export const Route = createFileRoute('/_auth/dashboard/investigations/')({
    component: InvestigationPage,
    pendingComponent: InvestigationSkeleton,
})

function InvestigationPage() {
    return (
        <div className="h-full w-full px-4 py-12 bg-background overflow-auto">
            <div className='max-w-4xl mx-auto flex flex-col gap-12 items-center justify-start'>
                <RecentInvestigations />
                <GetStartedSection />
                <DiscoverSection />
                <UsefulResources />
            </div>
        </div>
    )
}
