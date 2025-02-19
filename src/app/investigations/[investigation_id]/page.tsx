import { getInvestigationData } from '@/lib/actions/investigations'
import InvestigationGraph from '@/components/investigations/graph'
import IndividualModal from '@/components/investigations/individual-modal'

const DashboardPage = async ({
    params,
}: {
    params: Promise<{ investigation_id: string }>
}) => {
    const { investigation_id } = await (params)
    const { nodes, edges } = await getInvestigationData(investigation_id)
    return (
        <div>
            <InvestigationGraph initialNodes={nodes} initialEdges={edges} />
            <IndividualModal />
        </div>
    )
}
export default DashboardPage