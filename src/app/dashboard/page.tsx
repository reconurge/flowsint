import React from 'react'
import { getInvestigations } from '@/src/lib/actions/investigations'
import Investigation from '@/src/components/dashboard/investigation'

const DashboardPage = async () => {
    const { investigations, error } = await getInvestigations()
    if (error) return <div>An error occured.</div>
    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3'>{investigations.map((investigation) => (
            <Investigation key={investigation.id} investigation={investigation} />
        ))}
        </div>
    )
}
export default DashboardPage