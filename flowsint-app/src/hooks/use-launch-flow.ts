import { toast } from 'sonner'
import { useConfirm } from '@/components/use-confirm-dialog'
import { flowService } from '@/api/flow-service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { useLayoutStore } from '@/stores/layout-store'

export function useLaunchFlow(askUser: boolean = false) {
  const { confirm } = useConfirm()
  const queryClient = useQueryClient()
  const openClonsole = useLayoutStore(s => s.openConsole)

  // Launch flow mutation
  const launchFlowMutation = useMutation({
    mutationFn: ({ flowId, body }: { flowId: string; body: BodyInit }) =>
      flowService.launch(flowId, body),
    onSuccess: (_, variables) => {
      openClonsole()
      queryClient.invalidateQueries({
        queryKey: queryKeys.flows.detail(variables.flowId)
      })
    },
    onError: (error) => {
      console.error('Error launching flow:', error)
    }
  })

  const launchFlow = async (
    values: string[],
    flow_id: string,
    sketch_id: string | null | undefined
  ) => {
    if (!sketch_id) return toast.error('Could not find the graph.')
    if (askUser) {
      const confirmed = await confirm({
        title: `${flow_id} scan`,
        message: `You're about to launch ${flow_id} flow on ${values.length} items.`
      })
      if (!confirmed) return
    }
    const body = JSON.stringify({ values, sketch_id })
    const sliced = values.slice(0, 2)
    const left = values.length - sliced.length

    toast.promise(launchFlowMutation.mutateAsync({ flowId: flow_id, body }), {
      loading: 'Loading...',
      success: () =>
        `Flow ${flow_id} has been launched on "${sliced.join(',')}" ${left > 0 && ` and ${left} others`}.`,
      error: () => `An error occurred launching flow.`
    })
    return
  }

  return {
    launchFlow
  }
}
