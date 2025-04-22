import TransformEditor from "@/components/templates/editor"
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
export default async function Editor() {
    const nodesData = await fetchNodes()
    return <TransformEditor nodesData={nodesData} />
}