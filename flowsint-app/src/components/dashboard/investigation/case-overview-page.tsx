
import { CaseHeader } from "./case-header"
// import { MetricsGrid } from "./metrics-grid"
// import { ActivityTimeline } from "./activity-timeline"
import { SketchesSection } from "./sketches-section"
import { AnalysesSection } from "./analyses-section"
// import { EvidenceSection } from "./evidence-section"
// import { TasksSection } from "./tasks-section"
import { Investigation } from "@/types"

type CaseOverviewPageProps = {
  investigation: Investigation
}
export function CaseOverviewPage({ investigation }: CaseOverviewPageProps) {

  return (
    <main className="flex-1 h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <CaseHeader investigation={investigation} />
        {/* <MetricsGrid investigation={investigation} /> */}

        <div className="space-y-8">
          <SketchesSection sketches={investigation.sketches} />
          <AnalysesSection analyses={investigation.analyses} />

          {/* Two column for smaller sections */}
          {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <EvidenceSection />
            <div className="space-y-8">
              <TasksSection />
              <ActivityTimeline />
            </div>
          </div> */}
        </div>
      </div>
    </main>
  )
}
