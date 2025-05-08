import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ sketch_id: string }> }) {
    const { sketch_id } = await params
    const supabase = await createClient()
    try {
        await supabase.auth.refreshSession()
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        const response = await fetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/sketch/${sketch_id}/nodes`, {
            headers: {
                'Authorization': `Bearer ${jwt}`,
                "Content-Type": "application/json",
            },
        })
        const re = await response.json()
        if (!response.ok) {
            return NextResponse.json({ error: "An error occured." }, { status: 500 })
        }
        return NextResponse.json(re, { status: 200 })
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
