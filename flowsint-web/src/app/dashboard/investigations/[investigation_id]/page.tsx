"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams, useSearchParams } from "next/navigation"
import { InvestigationLayout } from "@/components/investigations/investigation-layout"
import { DocumentList } from "@/components/investigations/documents-list"
import { SketchList } from "@/components/investigations/sketch-list"
import { InvestigationSettings } from "@/components/investigations/investigation-settings"
import { clientFetch } from "@/lib/client-fetch"

const DashboardPage = () => {
    const { investigation_id } = useParams()
    const searchParams = useSearchParams()
    const currentTab = searchParams.get("tab") || "overview"

    // This query will be deduplicated since it's also in the layout
    const { data: investigation } = useQuery({
        queryKey: [process.env.NEXT_PUBLIC_FLOWSINT_API, "dashboard", "investigations", investigation_id],
        queryFn: async () => {
            const data = await clientFetch(`${process.env.NEXT_PUBLIC_FLOWSINT_API}/investigations/${investigation_id}`)
            return data
        },
    })

    const renderTabContent = () => {
        switch (currentTab) {
            case "overview":
                return (
                    <div className="grid gap-6">
                        <SketchList sketches={investigation?.sketches || []} investigation_id={investigation_id as string} />
                        <DocumentList documents={investigation?.documents || []} investigation_id={investigation_id as string} />
                    </div>
                )
            case "sketches":
                return <SketchList sketches={investigation?.sketches || []} investigation_id={investigation_id as string} />
            case "documents":
                return <DocumentList documents={investigation?.documents || []} investigation_id={investigation_id as string} />
            case "configurations":
                return <InvestigationSettings investigation={investigation} />
            default:
                return null
        }
    }

    return (
        <InvestigationLayout investigation_id={investigation_id as string}>
            {renderTabContent()}
        </InvestigationLayout>
    )
}

export default DashboardPage

