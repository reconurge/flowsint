"use client"
import { useQuery } from "@tanstack/react-query"
import OrganizationGraph from "@/components/organigrams/graph"
import IndividualModal from "@/components/investigations/individual-modal"
import { notFound } from "next/navigation"
interface DashboardClientProps {
    projectId: string
    organizationId: string
}
export default function OrganigramClient({ projectId, organizationId }: DashboardClientProps) {
    const graphQuery = useQuery({
        queryKey: ["project", [projectId], "organigram", organizationId],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/organigrams/${organizationId}/sketch`)
            if (!res.ok) {
                notFound()
            }
            return res.json()
        },
        refetchOnWindowFocus: true,
    })
    return (
        <>
            <OrganizationGraph graphQuery={graphQuery} />
            <IndividualModal />
        </>
    )
}

