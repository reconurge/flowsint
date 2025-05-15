"use client"
import { toast } from "sonner"
import { useConfirm } from "@/components/use-confirm-dialog"
import { performTransform } from "@/lib/actions/transform"
export function useLaunchTransform(askUser: boolean = false) {
    const { confirm } = useConfirm()
    const launchTransform = async (values: string[], transform_id: string, sketch_id: string | null) => {
        if (askUser) {
            const confirmed = await confirm({
                title: `${transform_id} scan`,
                message: `You're about to launch ${transform_id} transform on ${values.length} items.`,
            })
            if (!confirmed) return
        }
        toast.promise(performTransform(values, transform_id, sketch_id), {
            loading: "Loading...",
            success: () => `Scan on "${values.join(",")}" has been launched.`,
            error: () => `An error occurred launching transform.`,
        })
    }
    return {
        launchTransform,
    }
}
