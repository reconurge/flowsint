import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ project_id: string }> }) {
    const { project_id } = await params
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: project, error } = await supabase.from("projects")
            .select("*, investigations(*, owner:owner_id(first_name, last_name), individuals(id)), owner:owner_id(first_name, last_name)")
            .eq("id", project_id)
            .single()
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }
        return NextResponse.json(project)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

