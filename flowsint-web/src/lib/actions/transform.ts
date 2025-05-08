'use server'
import { createClient } from "@/lib/supabase/server";
export async function performTransform(values: string[], transform_id: string, sketch_id: string | null) {
    const supabase = await createClient()
    await supabase.auth.refreshSession()
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    const url = `${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/transforms/${transform_id}/launch`;
    const body = JSON.stringify({
        values: values,
        sketch_id: sketch_id
    })
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwt}`,
            "Content-Type": "application/json",
        },
        body
    },
    );
    const resp = await response.json()
    console.log(resp)
    if (response.status !== 200) throw Error(`Error: received status ${response.status}`)
    return { ...resp, status: response.status };
}