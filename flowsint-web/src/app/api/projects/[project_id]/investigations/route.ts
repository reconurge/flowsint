import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ project_id: string }> }) {
    try {
        const { project_id } = await params
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: investigations, error } = await supabase.from("investigations")
            .select("id, title, description, status, project_id, last_updated_at, project:projects(id, name), members:investigations_profiles(profile:profiles(id, first_name, last_name), role)")
            .order("last_updated_at", { ascending: false })
            .eq("project_id", project_id)
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(investigations)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

