import FileUploadDialog from "@/components/investigations/file-upload";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const DashboardLayout = async ({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ investigation_id: string }>
}) => {
    const supabase = await createClient()
    const { investigation_id } = await (params)
    const { data: investigation, error } = await supabase.from("investigations").select("id").eq("id", investigation_id).single()
    if (!investigation || error) {
        return notFound()
    }
    return (
        <>
            {children}
            <FileUploadDialog />
        </>
    )
}
export default DashboardLayout