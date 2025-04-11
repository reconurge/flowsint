import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ sketch_id: string, investigation_id: string }> }) {
    const { sketch_id, investigation_id } = await params
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: sketch, error } = await supabase
            .from("sketches")
            .select("id, title, description, last_updated_at, investigation_id, investigation:investigations(id, name), members:sketches_profiles(profile:profiles(id, first_name, last_name), role)")
            .eq("id", sketch_id)
            .eq("investigation_id", investigation_id)
            .single()
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        if (!sketch) {
            return NextResponse.json({ error: "Sketch not found" }, { status: 404 })
        }
        return NextResponse.json({ sketch })
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

