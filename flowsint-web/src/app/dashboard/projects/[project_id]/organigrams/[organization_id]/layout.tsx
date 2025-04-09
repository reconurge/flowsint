import { InvestigationProvider } from '@/components/contexts/investigation-provider';
import { SearchProvider } from '@/components/contexts/search-context';
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatProvider } from '@/components/contexts/chatbot-context';
import { InvestigationtNavigation } from '@/components/investigations/investigation-navigation';
import { ScanDrawer } from '@/components/investigations/scan-drawer';
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
    return (
        children
    )
}

export default DashboardLayout