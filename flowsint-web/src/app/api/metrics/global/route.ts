import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        now.setDate(now.getDate() + 1); // Ajoute un jour à "today"
        let start = request.nextUrl.searchParams.get("start") || oneMonthAgo.toISOString().split("T")[0];
        let end = request.nextUrl.searchParams.get("end") || now.toISOString().split("T")[0];

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data, error } = await supabase.rpc('get_global_metrics', {
            start_date: start,
            end_date: end
        }).single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

