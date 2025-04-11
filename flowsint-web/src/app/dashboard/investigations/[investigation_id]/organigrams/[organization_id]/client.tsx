"use client"
import { useQuery } from "@tanstack/react-query"
import OrganizationGraph from "@/components/organigrams/graph"
import { notFound } from "next/navigation"
interface DashboardClientProps {
    investigationId: string
    organizationId: string
}
export default function OrganigramClient({ investigationId, organizationId }: DashboardClientProps) {
    const graphQuery = useQuery({
        queryKey: ["investigations", [investigationId], "organigram", organizationId],
        queryFn: async () => {
            const res = await fetch(`/api/investigations/${investigationId}/organigrams/${organizationId}/sketch`)
            if (!res.ok) {
                notFound()
            }
            return res.json()
        },
        refetchOnWindowFocus: true,
    })
    return (
        <OrganizationGraph graphQuery={graphQuery} />
    )
}

