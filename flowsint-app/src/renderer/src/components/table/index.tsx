import { useGraphStore } from "@/stores/graph-store"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import React from "react"

export default function NodesTable() {
    const nodes = useGraphStore(s => s.nodes)
    
    // Memoize columns to prevent unnecessary re-renders
    const memoizedColumns = React.useMemo(() => columns, [])

    return (
        <div className="w-full pt-14">
            <DataTable columns={memoizedColumns} data={nodes} />
        </div>
    )
}