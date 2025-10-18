import { toast } from 'sonner'
import { useConfirm } from '@/components/use-confirm-dialog'
import { transformService } from '@/api/transform-service'
import { useLayoutStore } from '@/stores/layout-store'

export function useLaunchTransform(askUser: boolean = false) {
  const { confirm } = useConfirm()
  const openClonsole = useLayoutStore(s => s.openConsole)

  const launchTransform = async (
    values: string[],
    transformName: string,
    sketch_id: string | null | undefined
  ) => {
    if (!sketch_id) return toast.error('Could not find the graph.')
    if (askUser) {
      const confirmed = await confirm({
        title: `${transformName} scan`,
        message: `You're about to launch ${transformName} transform on ${values.length} items.`
      })
      if (!confirmed) return
    }
    const body = JSON.stringify({ values, sketch_id })
    const sliced = values.slice(0, 2)
    const left = values.length - sliced.length
    toast.promise(transformService.launch(transformName, body), {
      loading: 'Loading...',
      success: () =>
        `Transform ${transformName} has been launched on ${sliced.join(', ')}${left > 0 ? ` and ${left} others` : ''}.`,
      error: () => `An error occurred launching transform.`
    })
    openClonsole()
    return
  }
  return {
    launchTransform
  }
}
