import { serverFetch } from "@/lib/server-fetch";
import { notFound } from "next/navigation";

const DashboardLayout = async ({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ investigation_id: string }>
}) => {
    const { investigation_id } = await params
    const investigation = await serverFetch(`${process.env.NEXT_PUBLIC_DOCKER_FLOWSINT_API}/investigations/${investigation_id}`)

    if (!investigation) {
        return notFound()
    }
    return (
        <>
            {children}
        </>
    )
}
export default DashboardLayout