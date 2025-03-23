"use client"
import { useQuery } from "@tanstack/react-query"
import InvestigationGraph from "@/components/investigations/sketch/graph"
import LargeInvestigationGraph from '@/components/investigations/sketch/large-data-graph'
import IndividualModal from "@/components/investigations/individual-modal"
import { notFound } from "next/navigation"
import { useQueryState } from "nuqs"
interface ProfileProps {
    projectId: string
    individualId: string
}
export default function DashboardClient({ projectId, individualId }: ProfileProps) {
    // Use the initial data from the server, but enable background updates
    const [view, _] = useQueryState("view", { defaultValue: "flow-graph" })
    const graphQuery = useQuery({
        queryKey: ["project", individualId, "individuals", individualId],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/individuals/${individualId}`)
            if (!res.ok) {
                notFound()
            }
            return res.json()
        },
        refetchOnWindowFocus: true,
    })
    return (
        <div>
            {view === "flow-graph" ?
                <InvestigationGraph graphQuery={graphQuery} />
                :
                <LargeInvestigationGraph graphQuery={graphQuery} />
            }
            <IndividualModal />
        </div>
    )
}

