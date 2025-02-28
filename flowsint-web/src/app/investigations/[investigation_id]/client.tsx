"use client"
import { useQuery } from "@tanstack/react-query"
import InvestigationGraph from "@/components/investigations/graph"
import LargeInvestigationGraph from '@/components/investigations/large-data-graph'
import IndividualModal from "@/components/investigations/individual-modal"
import { notFound } from "next/navigation"
import { useQueryState } from "nuqs"
interface DashboardClientProps {
    investigationId: string
}
export default function DashboardClient({ investigationId }: DashboardClientProps) {
    // Use the initial data from the server, but enable background updates
    const [view, _] = useQueryState("view", { defaultValue: "flow-graph" })
    const graphQuery = useQuery({
        queryKey: ["investigation", investigationId, "data"],
        queryFn: async () => {
            const res = await fetch(`/api/investigations/${investigationId}/data`)
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

