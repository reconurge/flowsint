import { notFound, redirect, unauthorized } from "next/navigation"
import DashboardClient from "./client"
import { serverFetch } from "@/lib/server-fetch"
import { auth } from "@/auth"

const InvestigationPage = async ({
    params,
}: {
    params: Promise<{ investigation_id: string, sketch_id: string }>
}) => {
    const session = await auth();
    if (!session) return redirect("/login")
    const { investigation_id, sketch_id } = await (params)
    const sketch = await serverFetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/sketches/${sketch_id}`)
    if (!sketch) {
        return notFound()
    }
    return (
        <>
            <DashboardClient investigationId={investigation_id} sketchId={sketch_id} sketch={sketch} user_id={session?.user?.id as string} />
        </>)
}

export default InvestigationPage

