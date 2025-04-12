import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ investigation_id: string }> }) {
    try {
        const { investigation_id } = await params
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: sketches, error } = await supabase.from("sketches")
            .select("id, title, description, status, owner_id, investigation_id, last_updated_at, investigation:investigations(id, name), members:sketches_profiles(profile:profiles(id, first_name, last_name), role)")
            .order("last_updated_at", { ascending: false })
            .eq("investigation_id", investigation_id)
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(sketches)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

