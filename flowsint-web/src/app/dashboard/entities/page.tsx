import React from 'react'
import data from "./data.json"
import { DataTable } from './data-table'
const page = () => {
    return (
        <div className="w-full space-y-8 container mx-auto py-12 px-8">
            <DataTable data={data} />
        </div>
    )
}

export default page