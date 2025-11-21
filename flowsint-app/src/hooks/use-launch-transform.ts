import { toast } from 'sonner'
import { useConfirm } from '@/components/use-confirm-dialog'
import { transformService } from '@/api/transform-service'
import { useLayoutStore } from '@/stores/layout-store'

export function useLaunchTransform(askUser: boolean = false) {
  const { confirm } = useConfirm()
  const openClonsole = useLayoutStore(s => s.openConsole)

  const launchTransform = async (
    node_ids: string[],
    transformName: string,
    sketch_id: string | null | undefined
  ) => {
    if (!sketch_id) return toast.error('Could not find the graph.')
    if (askUser) {
      const confirmed = await confirm({
        title: `${transformName} scan`,
        message: `You're about to launch ${transformName} transform on ${node_ids.length} items.`
      })
      if (!confirmed) return
    }
    const body = JSON.stringify({ node_ids, sketch_id })
    const count = node_ids.length
    toast.promise(transformService.launch(transformName, body), {
      loading: 'Loading...',
      success: () =>
        `Transform ${transformName} has been launched on ${count} node${count > 1 ? 's' : ''}.`,
      error: () => `An error occurred launching transform.`
    })
    openClonsole()
    return
  }
  return {
    launchTransform
  }
}
