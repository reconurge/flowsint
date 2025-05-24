import { createFileRoute } from '@tanstack/react-router'
import GraphPanel from '@/components/graphs/graph-panel'
import { sketchService } from '@/api/sketch-service'
import { useTabEditorStore } from '@/store/tab-editor-store'
import { useEffect } from 'react'

export const Route = createFileRoute('/_auth/dashboard/investigations/$investigationId/$type/$id')({
    loader: async ({ params: { investigationId, type, id } }) => {
        return {
            data: type === "graph" ? await sketchService.getById(id) : null,
            type: type,
            id: id,
            investigationId: investigationId
        }
    },
    component: GraphPage,
})

function GraphPage() {
    const { id, type, investigationId, data } = Route.useLoaderData()
    const addTab = useTabEditorStore((s) => s.addTab)
    const tabs = useTabEditorStore((s) => s.tabs)

    useEffect(() => {
        if (!id || !type || !investigationId) return
        const alreadyExists = tabs.some(
            (t) =>
                t.id === id &&
                t.type === type &&
                t.investigationId === investigationId,
        )
        if (!alreadyExists) {
            addTab({
                id,
                type: type as "graph" | "wall",
                investigationId,
                title: data.title,
                data: data,
            })
        }
    }, [id, type, investigationId, tabs, addTab])
    if (type === "graph") {
        return (

            <div className='grow h-full w-full overflow-hidden flex flex-col'>
                <div className='grow'>
                    <GraphPanel />
                </div>
            </div>
        )
    }
    return (<div>Type not supported yet.</div>)
}