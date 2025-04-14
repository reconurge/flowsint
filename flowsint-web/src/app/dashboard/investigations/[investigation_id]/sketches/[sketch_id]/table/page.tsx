"use client"
import React, { useState } from 'react'
import { DataTable } from './data-table'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { TableSkeleton } from '@/components/ui/table-skeleton'

const IndividualsPage = () => {

    const { sketch_id, investigation_id } = useParams()
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

    const fetchIndividuals = async () => {
        const response = await fetch(`/api/investigations/${investigation_id}/sketches/${sketch_id}/table?page=${pagination.pageIndex + 1}&size=${pagination.pageSize}&includeEmails=true&includePhones=true`)
        return response.json()
    }

    const { data, isLoading, error, refetch, isRefetching } = useQuery({
        queryKey: ['individuals', 'table', sketch_id, pagination.pageIndex, pagination.pageSize],
        queryFn: fetchIndividuals,
    })

    if (error) return <div>Error fetching data.</div>
    return (
        <div className="w-full space-y-8 mx-auto py-12 px-8">
            {isLoading ? <TableSkeleton /> :
                <DataTable data={data}
                    pageCount={data?.length}
                    pagination={pagination}
                    refetch={refetch}
                    setPagination={setPagination}
                    isRefetching={isRefetching}
                />
            }
        </div>
    )
}

export default IndividualsPage