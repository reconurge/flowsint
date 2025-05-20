import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { redirect } from "next/navigation";
import { MainNav } from "@/components/dashboard/main-nav";
import Link from "next/link";
import SecondaryNav from "@/components/dashboard/secondary-nav";
import { auth } from "@/auth";

const DashboardLayout = async ({
    children,
}: {
    children: React.ReactNode;

}) => {
    const session = await auth();
    if (!session) return redirect("/login")

    return (
        <SidebarProvider>
            <SidebarInset>
                <div className="flex flex-col flex-1 min-h-screen flex-col bg-background">
                    <header className="sticky top-0 z-50 bg-card border-b">
                        <div className="flex h-12 items-center px-4">
                            <Link href="/dashboard" className="flex items-center gap-1">
                                <div className={"relative w-6 h-6"}>
                                    <div className="absolute inset-0 rounded-full border-4 border-primary" />
                                    <div
                                        className="absolute inset-1 rounded-full border-4 border-secondary"
                                    />
                                    <div
                                        className="absolute inset-2 rounded-full border-2 border-cyan-500"
                                    />
                                </div>
                                {/* <span className='opacity-60 text-sm'>/</span> */}
                            </Link>
                            {/* <Separator orientation="vertical" className="h-6" /> */}
                            <MainNav className="mx-6" />
                            {/* @ts-ignore */}
                            <SecondaryNav profile_id={session?.user?.id as string} />
                        </div>
                    </header>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
export default DashboardLayout