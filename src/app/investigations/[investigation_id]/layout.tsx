import { InvestigationProvider } from '@/src/components/investigations/investigation-provider';
import InvestigationLayout from '@/src/components/investigations/layout';
import { getInvestigation } from '@/src/lib/actions/investigations';

const DashboardLayout = async ({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ investigation_id: string }>
}) => {
    const { investigation_id } = await (params)
    const { investigation, error } = await getInvestigation(investigation_id)
    if (error) return <div>An error occured.</div>
    return (
        <InvestigationProvider>
            <InvestigationLayout investigation={investigation}>
                {children}
            </InvestigationLayout>
        </InvestigationProvider>
    )
}

export default DashboardLayout