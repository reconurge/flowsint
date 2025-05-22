import { useTabEditorStore } from "@/store/tab-editor-store"
import { useNavigate, useSearch } from "@tanstack/react-router"

export function useSetActiveTab() {
    const navigate = useNavigate()
    const addTab = useTabEditorStore(s => s.addTab)
    return (id: string) => {
        addTab(id)
        navigate({
            //@ts-ignore
            search: (prev) => ({ ...prev, graph: id }),
        })
    }
}

export function useActiveTabId(): string | undefined {
    const { graph } = useSearch({ from: "/_auth/dashboard/investigations/$investigationId" }) // chemin de la route
    return graph
}
