import { toast } from 'sonner'
import { useConfirm } from '@/components/use-confirm-dialog'
import { enricherService } from '@/api/enricher-service'
import { useLayoutStore } from '@/stores/layout-store'

export function useLaunchEnricher(askUser: boolean = false) {
  const { confirm } = useConfirm()
  const openClonsole = useLayoutStore(s => s.openConsole)

  const launchEnricher = async (
    node_ids: string[],
    enricherName: string,
    sketch_id: string | null | undefined
  ) => {
    if (!sketch_id) return toast.error('Could not find the graph.')
    if (askUser) {
      const confirmed = await confirm({
        title: `${enricherName} scan`,
        message: `You're about to launch ${enricherName} enricher on ${node_ids.length} items.`
      })
      if (!confirmed) return
    }
    const body = JSON.stringify({ node_ids, sketch_id })
    const count = node_ids.length
    toast.promise(enricherService.launch(enricherName, body), {
      loading: 'Loading...',
      success: () =>
        `Enricher ${enricherName} has been launched on ${count} node${count > 1 ? 's' : ''}.`,
      error: () => `An error occurred launching enricher.`
    })
    // openClonsole()
    return
  }
  return {
    launchEnricher
  }
}
