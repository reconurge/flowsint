import { createFileRoute } from '@tanstack/react-router'
import { InvestigationSkeleton } from '@/components/dashboard/investigation-skeleton'
import { InvestigationCards } from '@/components/dashboard/investigation-cards'
// import { AnalysisCards } from '@/components/dashboard/analysis-cards';

export const Route = createFileRoute('/_auth/dashboard/')({
  component: DashboardPage,
  pendingComponent: InvestigationSkeleton
})

function DashboardPage() {
  return (
    <div className="h-full w-full bg-background overflow-y-auto" data-tour-id="welcome">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8 space-y-12" style={{ containerType: 'inline-size' }}>
        {/* Investigation Cards */}
        {/* <div className="flex flex-1 flex-col">
                    <div className="@container/main px-6 flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-semibold">Welcome back</h2>
                                </div>
                                <NewInvestigation noDropDown>
                                    <Button size="sm">
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Investigation
                                    </Button>
                                </NewInvestigation>
                            </div>
                            <SectionCards />
                            <div>
                                <ChartAreaInteractive />
                            </div>
                        </div>
                    </div>
                </div> */}
        <InvestigationCards />

        {/* Analysis Cards */}
        {/* <AnalysisCards /> */}
      </div>
    </div>
  )
}
