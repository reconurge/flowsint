'use server'
import { createClient } from "@/lib/supabase/server";
import { scans } from "@/lib/utils";
export async function performSearch(value: string, scan_name: string, sketch_id: string) {
    const supabase = await createClient()
    await supabase.auth.refreshSession()
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    const scan = scans.find((s) => s.scan_name === scan_name)
    if (!scan) {
        throw Error(`Scanner "${scan_name}" was not found.`)
    }
    const url = `${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/scan`;
    const body = JSON.stringify({
        scanner: scan.scan_name,
        sketch_id: sketch_id,
        value: value
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
    if (response.status !== 200) throw Error(`Error: received status ${response.status}`)
    return { ...resp, status: response.status };
}