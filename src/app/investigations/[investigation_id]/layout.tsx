import { InvestigationProvider } from '@/src/components/contexts/investigation-provider';
import InvestigationLayout from '@/src/components/investigations/layout';
import { getInvestigation } from '@/src/lib/actions/investigations';
import Filters from './filters';
import { SearchProvider } from '@/src/components/contexts/search-context';
import { notFound } from 'next/navigation';
const DashboardLayout = async ({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ investigation_id: string }>
}) => {
    const { investigation_id } = await (params)
    const { error } = await getInvestigation(investigation_id)
    if (error) return notFound()

    return (
        <InvestigationProvider>
            <SearchProvider>
                <InvestigationLayout left={<Filters investigation_id={investigation_id} />}>
                    {children}
                </InvestigationLayout>
            </SearchProvider>
        </InvestigationProvider>
    )
}

export default DashboardLayout