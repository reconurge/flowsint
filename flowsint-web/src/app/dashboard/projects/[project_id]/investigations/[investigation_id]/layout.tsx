import { InvestigationProvider } from '@/components/contexts/investigation-provider';
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { InvestigationtNavigation } from '@/components/investigations/investigation-navigation';
import { ScanDrawer } from '@/components/investigations/scan-drawer';
import { Investigation } from '@/types/investigation';
const DashboardLayout = async ({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ project_id: string, investigation_id: string }>
}) => {
    const supabase = await createClient()
    const { investigation_id, project_id } = await params
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data?.user) {
        redirect('/login')
    }
    const { data: investigation, error } = await supabase.from("investigations").select("id, members:investigations_profiles(profile:profiles(id, first_name, last_name), role)").eq("id", investigation_id).single()
    if (!investigation || error) {
        return notFound()
    }
    return (
        <InvestigationProvider>
            <div className="sticky z-40 bg-background w-full hidden md:flex top-[48px] border-b">
                <InvestigationtNavigation project_id={project_id} investigation_id={investigation_id} investigation={investigation as Investigation} />
            </div>
            {children}
            <ScanDrawer />
        </InvestigationProvider>
    )
}

export default DashboardLayout