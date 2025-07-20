import { transformService } from '@/api/transfrom-service'
import { useCallback, ReactNode, cloneElement, isValidElement } from 'react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { useTransformStore } from '@/stores/transform-store'

const NewTransform = ({ children }: { children: ReactNode }) => {
    const navigate = useNavigate()
    const setNodes = useTransformStore(state => state.setNodes)
    const setEdges = useTransformStore(state => state.setEdges)

    const handleCreateTransform = useCallback(async () => {
        toast.promise(
            (async () => {
                // Reset nodes and edges
                setNodes([])
                setEdges([])
                const response = await transformService.create(JSON.stringify({
                    name: "New flow",
                    description: "A new example flow.",
                    category: [],
                    transform_schema: {}
                }))
                navigate({ to: `/dashboard/transforms/${response.id}` })
                return response
            })(),
            {
                loading: 'Creating transform...',
                success: 'Transform created successfully.',
                error: 'Failed to create transform.'
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
export default NewTransform