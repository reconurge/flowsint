import React from 'react'
import { getInvestigations } from '@/src/lib/actions/investigations'
import Investigation from '@/src/components/dashboard/investigation'
import { Button, Flex } from '@radix-ui/themes'
import { DownloadIcon, FolderIcon, PlusIcon } from 'lucide-react'

const DashboardPage = async () => {
    const { investigations, error } = await getInvestigations()
    if (error) return <div>An error occured.</div>
    return (
        <div className='space-y-6'>
            <Flex gap="3">
                <Button><PlusIcon className='h-4 w-4' />Create</Button>
                <Button color="gray" variant='soft'><DownloadIcon className='h-4 w-4' />Upload</Button>
                <Button color="gray" variant='soft'><FolderIcon className='h-4 w-4' />Create organization</Button>
            </Flex>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5'>{investigations.map((investigation) => (
                <Investigation key={investigation.id} investigation={investigation} />
            ))}
            </div>
        </div>
    )
}
export default DashboardPage