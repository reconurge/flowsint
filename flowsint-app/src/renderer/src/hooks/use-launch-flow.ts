import { toast } from "sonner"
import { useConfirm } from "@/components/use-confirm-dialog"
import { flowService } from "@/api/flow-service"

export function useLaunchFlow(askUser: boolean = false) {
    const { confirm } = useConfirm()
    const launchFlow = async (values: string[], flow_id: string, sketch_id: string | null | undefined) => {
        if (!sketch_id) return toast.error("Could not find the graph.")
        if (askUser) {
            const confirmed = await confirm({
                title: `${flow_id} scan`,
                message: `You're about to launch ${flow_id} flow on ${values.length} items.`,
            })
            if (!confirmed) return
        }
        const body = JSON.stringify({ values, sketch_id })
        const sliced = values.slice(0, 2)
        const left = values.length - sliced.length
        toast.promise(flowService.launch(flow_id, body), {
            loading: "Loading...",
            success: () => `Flow ${flow_id} has been launched on "${sliced.join(",")}" ${left > 0 && ` and ${left} others`}.`,
            error: () => `An error occurred launching flow.`,
        })
        return
    }
    return {
        launchFlow,
    }
}
