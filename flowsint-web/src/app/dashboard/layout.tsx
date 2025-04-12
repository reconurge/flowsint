import { createClient } from "@/lib/supabase/server";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { redirect } from "next/navigation";
import { FingerprintIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/dashboard/main-nav";
import { NavUser } from "@/components/nav-user";
import Feedback from "@/components/dashboard/feedback";
import Link from "next/link";

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
            <SidebarInset>
                <div className="flex flex-col flex-1 min-h-screen flex-col bg-accent">
                    <header className="sticky top-0 z-50 bg-background border-b">
                        <div className="flex h-12 items-center px-4">
                            <Link href="/dashboard" className="flex items-center gap-1">
                                <FingerprintIcon className="mr-2 h-6 w-6 text-primary" />
                                <span className='opacity-60 text-sm'>/</span>
                            </Link>
                            {/* <Separator orientation="vertical" className="h-6" /> */}
                            <MainNav className="mx-6" />
                            <div className="ml-auto flex items-center space-x-2">
                                <div className="lg:flex hidden items-center space-x-2">
                                    <Feedback />
                                    <Button size={"sm"} variant={"ghost"}>Changelog</Button>
                                    <Button size={"sm"} variant={"ghost"}>Docs</Button>
                                </div>
                                <NavUser profile_id={data?.user.id} />
                            </div>
                        </div>
                    </header>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
export default DashboardLayout