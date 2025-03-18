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
                <header className="flex h-14 sticky top-0 bg-background/60 backdrop-blur border-b border-border justify-end shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <Button variant={"outline"}>Feedback</Button>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 container mx-auto py-12 px-8">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
export default DashboardLayout