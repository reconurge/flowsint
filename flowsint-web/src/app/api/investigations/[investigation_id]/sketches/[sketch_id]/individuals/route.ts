import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ sketch_id: string }> }) {
    const { sketch_id } = await params
    let size = request.nextUrl.searchParams.get("size") || 10
    let page = request.nextUrl.searchParams.get("page") || 1
    let includeEmails = request.nextUrl.searchParams.get("includeEmails") || false
    let includePhones = request.nextUrl.searchParams.get("includePhones") || false

    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { data: individuals, error } = await supabase
            .from('individuals')
            .select([`*`,
                includeEmails && "emails(email)",
                includePhones && "phone_numbers(phone_number)",
            ].filter(Boolean).join(', '), { count: "exact" })
            .order("created_at", { ascending: false })
            .eq("sketch_id", sketch_id)
        // .range()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json({ individuals })
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}