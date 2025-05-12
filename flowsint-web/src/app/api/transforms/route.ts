import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        let type = request.nextUrl.searchParams.get("type")
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (!type) {
            return NextResponse.json({ error: "Missing param 'type'" }, { status: 400 })
        }
        const { data: transforms, error } = await supabase.from("transforms")
            .select("id, name, description, category, created_at, last_updated_at")
            .order("last_updated_at", { ascending: false })
            .contains('category', [type])
        if (error) {
            console.log(error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(transforms)
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

