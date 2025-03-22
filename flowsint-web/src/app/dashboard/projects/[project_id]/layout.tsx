import FileUploadDialog from "@/components/projects/file-upload";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const DashboardLayout = async ({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ project_id: string }>
}) => {
    const supabase = await createClient()
    const { project_id } = await (params)
    const { data: project, error } = await supabase.from("projects").select("id").eq("id", project_id).single()
    if (!project || error) {
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