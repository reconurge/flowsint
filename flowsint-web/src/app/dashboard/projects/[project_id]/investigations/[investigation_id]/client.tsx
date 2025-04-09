"use client"
import { useQuery } from "@tanstack/react-query"
import InvestigationGraph from "@/components/investigations/sketch/graph"
import LargeInvestigationGraph from '@/components/investigations/sketch/large-data-graph'
import IndividualModal from "@/components/investigations/individual-modal"
import { notFound } from "next/navigation"
import { useQueryState } from "nuqs"
import { supabase } from "@/lib/supabase/client"
interface DashboardClientProps {
    projectId: string
    investigationId: string
}
export default function DashboardClient({ projectId, investigationId }: DashboardClientProps) {
    const [view, _] = useQueryState("view", { defaultValue: "flow-graph" })
    const graphQuery = useQuery({
        queryKey: ["investigation", investigationId, "data"],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/investigations/${investigationId}/sketch`)
            if (!res.ok) {
                notFound()
            }
            return res.json()
        },
        refetchOnWindowFocus: true,
    })
    return (
        <>
            {view === "flow-graph" ?
                <InvestigationGraph graphQuery={graphQuery} />
                :
                <LargeInvestigationGraph graphQuery={graphQuery} />
            }
            <IndividualModal />
        </>
    )
}

