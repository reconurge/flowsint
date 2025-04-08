import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: investigations, error } = await supabase.from("investigations")
            .select("id, title, description, last_updated_at, project_id, project:projects(id, name), members:investigations_profiles(profile:profiles(id, first_name, last_name), role)")
            .order("last_updated_at", { ascending: false })
            .limit(4)
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(investigations)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

