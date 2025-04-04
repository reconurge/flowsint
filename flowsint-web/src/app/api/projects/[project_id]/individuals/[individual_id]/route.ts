import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ individual_id: string, project_id: string }> }) {
    const { project_id, individual_id } = await params
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: individual, error } = await supabase
            .from('individuals')
            .select(`
                        *,
                        ip_addresses(*),
                        phone_numbers(*),
                        social_accounts(*),
                        emails(*)
                    `)
            .eq("id", individual_id)
            .single()
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        if (!individual) {
            return NextResponse.json({ error: "Individual not found" }, { status: 404 })
        }
        return NextResponse.json({ individual })
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

