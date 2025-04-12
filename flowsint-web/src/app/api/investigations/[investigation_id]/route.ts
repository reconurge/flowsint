import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ investigation_id: string }> }) {
    const { investigation_id } = await params
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: investigation, error } = await supabase.from("investigations")
            .select("*, members:investigations_profiles(profile:profiles(id, first_name, last_name), role), sketches(*, members:sketches_profiles(profile:profiles(id, first_name, last_name), role), individuals(id)), owner_id")
            .eq("id", investigation_id)
            .single()
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        if (!investigation) {
            return NextResponse.json({ error: "Investigation not found" }, { status: 404 })
        }
        return NextResponse.json(investigation)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

