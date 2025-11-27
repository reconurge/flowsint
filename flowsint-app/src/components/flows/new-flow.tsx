import { useCallback, ReactNode, cloneElement, isValidElement } from 'react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { useFlowStore } from '@/stores/flow-store'
import { flowService } from '@/api/flow-service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'

const NewFlow = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setNodes = useFlowStore((state) => state.setNodes)
  const setEdges = useFlowStore((state) => state.setEdges)

  const createFlowMutation = useMutation({
    mutationFn: flowService.create,
    onSuccess: (response) => {
      // Reset nodes and edges
      setNodes([])
      setEdges([])
      navigate({ to: `/dashboard/flows/${response.id}` })
      // Invalidate flows list
      queryClient.invalidateQueries({
        queryKey: queryKeys.flows.list
      })
    },
    onError: (error) => {
      toast.error(
        'Failed to create flow: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  const handleCreateFlow = useCallback(async () => {
    toast.promise(
      createFlowMutation.mutateAsync(
        JSON.stringify({
          name: 'New flow',
          description: 'A new example flow.',
          category: [],
          flow_schema: {}
        })
      ),
      {
        loading: 'Creating flow...',
        success: 'Flow created successfully.',
        error: 'Failed to create flow.'
      }
    )
  }, [createFlowMutation])

  if (!isValidElement(children)) {
    return null
  }

  return cloneElement(children as React.ReactElement<any>, {
    onClick: handleCreateFlow
  })
}
export default NewFlow
