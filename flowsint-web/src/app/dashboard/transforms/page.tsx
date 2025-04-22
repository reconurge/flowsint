import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import React from 'react'

const TransformsPage = async () => {
    const supabase = await createClient()
    const { data: transforms } = await supabase.from("transforms").select("*")

    return (
        <div className="w-full space-y-8 container mx-auto py-12 px-8">
            <div>
                <div>
                    <h1 className="font-semibold text-2xl">Transforms</h1>
                    <p className="opacity-60 mt-3">Here are the transforms used to gather informations.</p>
                </div>
                <div className="flex justify-end">
                    <Link href="/dashboard/transforms/editor">
                        <Button>New transform</Button>
                    </Link>
                </div>
            </div>
            <div className='w-full grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 xl:grid-cols-4 gap-4'>
                {transforms?.map((transform) => (
                    <TransformItem key={transform.id} transform={transform} />
                ))}
            </div>
        </div>
    )
}

const TransformItem = ({ transform }: { transform: any }) => {
    return (
        <Link href={`/dashboard/transforms/${transform.id}`} className="w-full">
            <div className="bg-card rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold">{transform.name}</h2>
                <p className="text-sm text-muted-foreground">{transform.description}</p>
                <span rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {transform?.transform_schema?.edges?.length} steps
                </span>
            </div>
        </Link>
    )
}
export default TransformsPage