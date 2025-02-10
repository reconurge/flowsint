import { InvestigationProvider } from '@/src/components/contexts/investigation-provider';
import InvestigationLayout from '@/src/components/investigations/layout';
import { getInvestigation } from '@/src/lib/actions/investigations';
import Individuals from './individuals';
import { SearchProvider } from '@/src/components/contexts/search-context';
import { notFound } from 'next/navigation';
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatProvider } from '@/src/components/contexts/chatbot-context';

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
    const { error } = await getInvestigation(investigation_id)
    if (error) return notFound()

    return (
        <InvestigationProvider>
            <SearchProvider>
                <ChatProvider>
                    <InvestigationLayout investigation_id={investigation_id} left={<Individuals investigation_id={investigation_id} />}>
                        {children}
                    </InvestigationLayout>
                </ChatProvider>
            </SearchProvider>
        </InvestigationProvider>
    )
}

export default DashboardLayout