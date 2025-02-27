import { notFound, unauthorized } from "next/navigation"
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
        return notFound()
    }
    return <DashboardClient investigationId={investigation_id} />
}

export default DashboardPage

