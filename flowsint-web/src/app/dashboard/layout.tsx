import { AppSidebar } from "@/components/app-sidebar"
import { createClient } from "@/lib/supabase/server";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

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
        <SidebarProvider>
            <AppSidebar user={data?.user} />
            <SidebarInset>
                <div className="flex flex-1 flex-col gap-4">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
export default DashboardLayout