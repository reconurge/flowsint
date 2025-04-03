"use client"
import React, { useState } from 'react'
import { DataTable } from './data-table'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { TableSkeleton } from '@/components/ui/table-skeleton'

const IndividualsPage = () => {

    const { investigation_id, project_id } = useParams()
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

    const fetchIndividuals = async () => {
        const response = await fetch(`/api/projects/${project_id}/investigations/${investigation_id}/individuals?page=${pagination.pageIndex + 1}&size=${pagination.pageSize}&includeEmails=true&includePhones=true`)
        return response.json()
    }

    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: ['individuals', 'table', investigation_id, pagination.pageIndex, pagination.pageSize],
        queryFn: fetchIndividuals,
    })

    if (isError) return <div>Error fetching deliveries</div>
    return (
        <div className="w-full space-y-8 mx-auto py-12 px-8">
            {isLoading ? <TableSkeleton /> :
                <DataTable data={data.individuals}
                    pageCount={data?.individuals?.length}
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