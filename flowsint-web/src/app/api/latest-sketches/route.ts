import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        let limit = request.nextUrl.searchParams.get("limit") || "4"
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: sketches, error } = await supabase.from("sketches")
            .select("id, title, owner_id, description, last_updated_at, investigation_id, investigation:investigations(id, name), members:sketches_profiles(profile:profiles(id, first_name, last_name, avatar_url), role)")
            .order("last_updated_at", { ascending: false })
            .limit(parseInt(limit))
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(sketches)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

