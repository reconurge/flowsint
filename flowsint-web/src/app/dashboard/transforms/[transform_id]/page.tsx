import TransformEditor from "@/components/transforms/editor"
import { serverFetch } from "@/lib/server-fetch"
import { notFound } from "next/navigation"

export default async function EditorCustom({
    params
}: {
    params: Promise<{ transform_id: string }>
}) {
    const { transform_id } = await (params)
    const nodesData = await serverFetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/transforms/raw_materials`)
    const transform = await serverFetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/transforms/${transform_id}`)

    if (!transform)
        return notFound()

    return <TransformEditor transform={transform} nodesData={nodesData} initialNodes={transform?.transform_schema?.nodes} initialEdges={transform?.transform_schema?.edges} />
}