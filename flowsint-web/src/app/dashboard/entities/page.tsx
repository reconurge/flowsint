import React from 'react'
import data from "./data.json"
import { DataTable } from './data-table'
import { SubNav } from '@/components/dashboard/sub-nav'
const page = () => {
    return (
        <>
            <div className="sticky z-40 bg-background w-full hidden md:flex top-[48px] border-b">
                <SubNav />
            </div>
            <div className="w-full space-y-8 container mx-auto py-12 px-8">
                <DataTable data={data} />
            </div>
        </>
    )
}

export default page