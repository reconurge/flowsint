import { notFound, redirect, unauthorized } from "next/navigation"
import DashboardClient from "./client"
import { createClient } from "@/lib/supabase/server"

const InvestigationPage = async ({
    params,
}: {
    params: Promise<{ investigation_id: string, sketch_id: string }>
}) => {
    const supabase = await createClient()
    const { investigation_id, sketch_id } = await (params)
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (!user || userError) {
        return redirect("/login")
    }
    const { data: sketch, error } = await supabase.from("sketches").select("*, members:sketches_profiles(profile:profiles(id, first_name, last_name, avatar_url), role)").eq("id", sketch_id).single()
    if (!sketch || error) {
        return notFound()
    }
    return <DashboardClient investigationId={investigation_id} sketchId={sketch_id} sketch={sketch} user_id={user?.id} />
}

export default InvestigationPage

