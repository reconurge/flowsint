import { InvestigationProvider } from '@/components/contexts/investigation-provider';
import InvestigationLayout from '@/components/investigations/layout';
import Left from './left';
import { SearchProvider } from '@/components/contexts/search-context';
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatProvider } from '@/components/contexts/chatbot-context';
const DashboardLayout = async ({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ project_id: string, investigation_id: string }>
}) => {
    const supabase = await createClient()
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data?.user) {
        redirect('/login')
    }
    return (
        <InvestigationProvider>
            <SearchProvider>
                <ChatProvider>
                    <InvestigationLayout>
                        {children}
                    </InvestigationLayout>
                </ChatProvider>
            </SearchProvider>
        </InvestigationProvider>
    )
}

export default DashboardLayout