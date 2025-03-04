import { notFound, redirect, unauthorized } from "next/navigation"
import DashboardClient from "./client"
import { createClient } from "@/lib/supabase/server"

// Server Component for initial data fetch
const DashboardPage = async ({
    params,
}: {
    params: Promise<{ investigation_id: string }>
}) => {
    const supabase = await createClient()
    const { investigation_id } = await (params)
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (!user || userError) {
        return redirect("/login")
    }
    const { data: investigation, error } = await supabase.from("investigations").select("id").eq("id", investigation_id).single()
    if (!investigation || error) {
        return notFound()
    }
    return <DashboardClient investigationId={investigation_id} />
}

export default DashboardPage

