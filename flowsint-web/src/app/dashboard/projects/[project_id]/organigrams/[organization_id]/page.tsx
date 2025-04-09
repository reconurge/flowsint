import { notFound, redirect, unauthorized } from "next/navigation"
import DashboardClient from "./client"
import { createClient } from "@/lib/supabase/server"

const OrganigramPage = async ({
    params,
}: {
    params: Promise<{ project_id: string, organization_id: string }>
}) => {
    const supabase = await createClient()
    const { project_id, organization_id } = await (params)
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (!user || userError) {
        return redirect("/login")
    }
    const { data: organization, error } = await supabase.from("organizations").select("id").eq("id", organization_id).single()
    if (!organization || error) {
        return notFound()
    }
    return <DashboardClient projectId={project_id} organizationId={organization_id} />
}

export default OrganigramPage

