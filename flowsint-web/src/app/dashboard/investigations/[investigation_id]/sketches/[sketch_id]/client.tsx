"use client"
import { useQuery } from "@tanstack/react-query"
import InvestigationGraph from "@/components/sketches/sketch/graph"
import LargeInvestigationGraph from '@/components/sketches/sketch/large-data-graph'
import { notFound } from "next/navigation"
import { useQueryState } from "nuqs"
interface DashboardClientProps {
    investigationId: string
    sketchId: string
}
export default function DashboardClient({ investigationId, sketchId }: DashboardClientProps) {
    const [view, _] = useQueryState("view", { defaultValue: "flow-graph" })
    const graphQuery = useQuery({
        queryKey: ["investigations", investigationId, 'sketches', sketchId, "data"],
        queryFn: async () => {
            const res = await fetch(`/api/investigations/${investigationId}/sketches/${sketchId}/sketch`)
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
        </>
    )
}

