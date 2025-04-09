import { createClient } from "@/lib/supabase/server"
import type { NodeData, EdgeData } from "@/types"
import { NextResponse } from "next/server"
import { generateOrganigram } from './initial'
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
        // const { data: graphData, error: graphError } = await supabase
        //     .from("organization_graph")
        //     .select("*")
        //     .eq("organization_id", organization_id)
        //     .single();
        const graphData = generateOrganigram(
            {
                numDepartments: 5,
                managersPerDepartment: 5,
                employeesPerManager: 10,
            }
        )
        return NextResponse.json(graphData, { status: 200 })
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
