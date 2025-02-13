import { InvestigationProvider } from '@/components/contexts/investigation-provider';
import InvestigationLayout from '@/components/investigations/layout';
import Left from './left';
import { SearchProvider } from '@/components/contexts/search-context';
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ChatProvider } from '@/components/contexts/chatbot-context';
import { getInvestigation } from '@/lib/actions/investigations';

const DashboardLayout = async ({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ investigation_id: string }>
}) => {
    const supabase = await createClient()
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data?.user) {
        redirect('/login')
    }
    const { investigation_id } = await (params)
    const { investigation, error } = await getInvestigation(investigation_id)
    if (!investigation || error) return notFound()
    return (
        <InvestigationProvider>
            <SearchProvider>
                <ChatProvider>
                    <InvestigationLayout user={data.user} investigation_id={investigation_id} left={<Left investigation_id={investigation_id} />}>
                        {children}
                    </InvestigationLayout>
                </ChatProvider>
            </SearchProvider>
        </InvestigationProvider>
    )
}

export default DashboardLayout