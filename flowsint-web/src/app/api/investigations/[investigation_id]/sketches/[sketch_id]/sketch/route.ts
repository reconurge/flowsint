import { createClient } from "@/lib/supabase/server"
import type { NodeData, EdgeData } from "@/types"
import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ sketch_id: string }> }) {
    const { sketch_id } = await params
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
            .from("sketch_graph")
            .select("*")
            .eq("sketch_id", sketch_id)
            .single();

        if (graphError) {
            return NextResponse.json({ error: graphError.message }, { status: 500 })
        }
        if (!graphData) {
            return NextResponse.json({ error: "Not found" }, { status: 404 })
        }
        return NextResponse.json(graphData, { status: 200 })
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
