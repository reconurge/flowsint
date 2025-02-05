import DisplaySelector from '@/src/components/investigations/display-selector';
import { InvestigationProvider } from '@/src/components/investigations/investigation-provider';
import InvestigationLayout from '@/src/components/investigations/layout';
import { getInvestigation } from '@/src/lib/actions/investigations';
import { Text } from '@radix-ui/themes';
import { usernames, countries, settings } from './data.js'
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

    const Left = () => (
        <div className='flex flex-col gap-2'>
            <Text size={"2"}>Display</Text>
            <DisplaySelector values={settings} />
            <Text size={"2"}>Countries</Text>
            <DisplaySelector values={countries} />
            <Text size={"2"}>Usernames</Text>
            <DisplaySelector values={usernames} />

        </div>
    )
    return (
        <InvestigationProvider>
            <InvestigationLayout left={<Left />} investigation={investigation}>
                {children}
            </InvestigationLayout>
        </InvestigationProvider>
    )
}

export default DashboardLayout