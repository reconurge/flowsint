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
    return <DashboardClient investigationId={investigation_id} sketchId={sketch_id} />
}

export default InvestigationPage

