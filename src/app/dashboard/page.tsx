import React from 'react'
import { getInvestigations } from '@/lib/actions/investigations'
import Investigation from '@/components/dashboard/investigation'
import { Button } from '@/components/ui/button'
import { DownloadIcon, FolderIcon, PlusIcon } from 'lucide-react'
import NewCase from '@/components/dashboard/new-case'

const DashboardPage = async () => {
    const { investigations, error } = await getInvestigations()
    if (error) return <div>An error occured.</div>
    return (
        <div className='space-y-6 max-w-6xl mx-auto p-6'>
            <div>
                <h1 className="text-3xl font-semibold mb-2">Vos investigations</h1>
                <p className="mb-6 opacity-70">
                    La liste de vos investigations. Vous pouvez également en créer d'autres.
                </p>
            </div>
            <div className='flex gap-3'>
                <NewCase>
                    <Button><PlusIcon className='h-4 w-4' />Create</Button>
                </NewCase>
                <Button variant='secondary'><DownloadIcon className='h-4 w-4' />Upload</Button>
                <Button variant='secondary'><FolderIcon className='h-4 w-4' />Create organization</Button>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5'>{investigations.map((investigation) => (
                <Investigation key={investigation.id} investigation={investigation} />
            ))}
            </div>
        </div>
    )
}
export default DashboardPage