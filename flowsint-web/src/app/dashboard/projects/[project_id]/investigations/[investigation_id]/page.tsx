import { notFound, redirect, unauthorized } from "next/navigation"
import DashboardClient from "./client"
import { createClient } from "@/lib/supabase/server"

const InvestigationPage = async ({
    params,
}: {
    params: Promise<{ project_id: string, investigation_id: string }>
}) => {
    const supabase = await createClient()
    const { project_id, investigation_id } = await (params)
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (!user || userError) {
        return redirect("/login")
    }
    return <DashboardClient projectId={project_id} investigationId={investigation_id} />
}

export default InvestigationPage

