import TransformEditor from "@/components/transforms/editor"
import { serverFetch } from "@/lib/server-fetch"

export default async function Editor() {
    const nodesData = await serverFetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/transforms/raw_materials`)
    return <TransformEditor nodesData={nodesData} />
}