import { useCallback, ReactNode, cloneElement, isValidElement } from 'react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { useFlowStore } from '@/stores/flow-store'
import { flowService } from '@/api/flow-service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { useTranslation } from 'react-i18next'

const NewFlow = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation()
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
        t('flows.editor.toast.createFailedReason') + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  })

  const handleCreateFlow = useCallback(async () => {
    toast.promise(
      createFlowMutation.mutateAsync(
        JSON.stringify({
          name: t('flows.editor.defaultName'),
          description: t('flows.editor.defaultDesc'),
          category: [],
          flow_schema: {}
        })
      ),
      {
        loading: t('flows.editor.toast.creating'),
        success: t('flows.editor.toast.created'),
        error: t('flows.editor.toast.createFailed')
      }
    )
  }, [createFlowMutation, t])

  if (!isValidElement(children)) {
    return null
  }

  return cloneElement(children as React.ReactElement<any>, {
    onClick: handleCreateFlow
  })
}
export default NewFlow
