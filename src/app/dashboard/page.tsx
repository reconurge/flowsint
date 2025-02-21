import React from 'react'
import Investigation from '@/components/dashboard/investigation'
import { Button } from '@/components/ui/button'
import { DownloadIcon, FolderIcon, PlusIcon } from 'lucide-react'
import NewCase from '@/components/dashboard/new-case'
import { createClient } from '@/lib/supabase/server'
import { unauthorized } from 'next/navigation'

const DashboardPage = async () => {
    const supabase = await createClient()
    const { data: investigations, error } = await supabase.from("investigations").select("id, title, description")
    if (error) return unauthorized()
    return (
        <div className='space-y-6 w-full p-12'>
            <div className='flex justify-between items-center'>
                <div className=''>
                    <h1 className="text-3xl font-semibold mb-2">Vos investigations</h1>
                    <p className="mb-6 opacity-70">
                        La liste de vos investigations. Vous pouvez également en créer d'autres.
                    </p>
                </div>
                <div className='flex gap-3'>
                    <NewCase>
                        <Button><PlusIcon className='h-4 w-4' />Create</Button>
                    </NewCase>
                    {/* <Button variant='secondary'><DownloadIcon className='h-4 w-4' />Upload</Button>
                <Button variant='secondary'><FolderIcon className='h-4 w-4' />Create organization</Button> */}
                </div>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5'>{investigations.map((investigation) => (
                <Investigation key={investigation.id} investigation={investigation} />
            ))}
            </div>
        </div>
    )
}
export default DashboardPage