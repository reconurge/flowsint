"use client"
import { toast } from "sonner"
import { useConfirm } from "@/components/use-confirm-dialog"
import { transformService } from "@/api/transfrom-service"

export function useLaunchTransform(askUser: boolean = false) {
    const { confirm } = useConfirm()
    const launchTransform = async (values: string[], transform_id: string, sketch_id: string | undefined) => {
        if (!sketch_id) return toast.error("Could not find the graph.")
        if (askUser) {
            const confirmed = await confirm({
                title: `${transform_id} scan`,
                message: `You're about to launch ${transform_id} transform on ${values.length} items.`,
            })
            if (!confirmed) return
        }
        const body = JSON.stringify({ values, sketch_id })
        toast.promise(transformService.launch(transform_id, body), {
            loading: "Loading...",
            success: () => `Scan on "${values.join(",")}" has been launched.`,
            error: () => `An error occurred launching transform.`,
        })
    }
    return {
        launchTransform,
    }
}
