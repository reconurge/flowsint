
import { CaseHeader } from "./case-header"
import { SketchesSection } from "./sketches-section"
import { AnalysesSection } from "./analyses-section"
import { Investigation } from "@/types"
import { usePermissions } from "@/hooks/use-can"

type CaseOverviewPageProps = {
  investigation: Investigation
}
export function CaseOverviewPage({ investigation }: CaseOverviewPageProps) {
  const { canCreate } = usePermissions()

  return (
    <main className="flex-1 h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <CaseHeader investigation={investigation} />

        <div className="space-y-8">
          <SketchesSection sketches={investigation.sketches} canCreate={canCreate} />
          <AnalysesSection analyses={investigation.analyses} canCreate={canCreate} />
        </div>
      </div>
    </main>
  )
}
