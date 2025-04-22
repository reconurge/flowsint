import TransformEditor from "@/components/templates/editor"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

async function fetchNodes() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/transforms/nodes`, {
        next: { revalidate: 3600 }
    })
    if (!res.ok) {
        notFound()
    }
    return res.json()
}
export default async function EditorCustom({
    params
}: {
    children: React.ReactNode;
    params: Promise<{ transform_id: string }>
}) {
    const { transform_id } = await (params)
    const supabase = await createClient()
    const nodesData = await fetchNodes()
    const { data: transform } = await supabase.from("transforms").select("*").eq("id", transform_id as string).single()
    return <TransformEditor nodesData={nodesData} initialNodes={transform?.transform_schema?.nodes} initialEdges={transform?.transform_schema?.edges} />
}