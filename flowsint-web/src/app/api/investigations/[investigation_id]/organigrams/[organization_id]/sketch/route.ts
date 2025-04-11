import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
export async function GET(_: Request, { params }: { params: Promise<{ organization_id: string }> }) {
    const { organization_id } = await params
    const supabase = await createClient()
    try {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: graphData, error: graphError } = await supabase
            .from("organization_graph")
            .select("*")
            .eq("organization_id", organization_id)
            .single();
        if (graphError) return NextResponse.json({ error: "Internal Server Error", message: graphError }, { status: 500 })
        return NextResponse.json(graphData, { status: 200 })
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
