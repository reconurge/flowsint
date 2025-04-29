import Client from "./client"
async function getGraphData() {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/sketch/nodes`, {
            cache: "no-store",
        })
        if (!res.ok) {
            return { nodes: [], edges: [] }
        }
        return res.json()
    } catch (error) {
        console.error("Erreur:", error)
        return { nodes: [], edges: [] }
    }
}
export default async function Home() {
    const initialData = await getGraphData()
    return (
        <Client data={initialData} />
    )
}
