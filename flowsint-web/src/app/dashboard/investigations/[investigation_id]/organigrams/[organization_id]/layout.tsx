import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
const DashboardLayout = async ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const supabase = await createClient()
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data?.user) {
        redirect('/login')
    }
    return (
        children
    )
}

export default DashboardLayout