import { useCallback, ReactNode, cloneElement, isValidElement } from 'react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { useFlowStore } from '@/stores/flow-store'
import { flowService } from '@/api/flow-service'

const NewFlow = ({ children }: { children: ReactNode }) => {
    const navigate = useNavigate()
    const setNodes = useFlowStore(state => state.setNodes)
    const setEdges = useFlowStore(state => state.setEdges)

    const handleCreateTransform = useCallback(async () => {
        toast.promise(
            (async () => {
                // Reset nodes and edges
                setNodes([])
                setEdges([])
                const response = await flowService.create(JSON.stringify({
                    name: "New flow",
                    description: "A new example flow.",
                    category: [],
                    flow_schema: {}
                }))
                navigate({ to: `/dashboard/flows/${response.id}` })
                return response
            })(),
            {
                loading: 'Creating transform...',
                success: 'Transform created successfully.',
                error: 'Failed to create flow.'
            }
        )

    }, [setNodes, setEdges, navigate])

    if (!isValidElement(children)) {
        return null
    }

    return cloneElement(children as React.ReactElement<any>, {
        onClick: handleCreateTransform
    })
}
export default NewFlow