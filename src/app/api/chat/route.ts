import { mistral } from '@ai-sdk/mistral';
import { streamText } from 'ai';
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (!user || userError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { messages } = await req.json();

    const result = streamText({
        model: mistral('mistral-tiny'),
        messages,
    });

    return result.toDataStreamResponse();
}