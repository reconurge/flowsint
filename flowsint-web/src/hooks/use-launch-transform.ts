"use client"
import { toast } from "sonner"
import { useConfirm } from "@/components/use-confirm-dialog"
import { performTransform } from "@/lib/actions/transform"
export function useLaunchTransform(askUser: boolean = false) {
    const { confirm } = useConfirm()
    const launchTransform = async (values: string[], transform_id: string) => {
        if (askUser) {
            const confirmed = await confirm({
                title: `${transform_id} scan`,
                message: `You're about to launch ${transform_id} transform on ${values.length} items.`,
            })
            if (!confirmed) return
        }
        toast.promise(performTransform(values, transform_id), {
            loading: "Loading...",
            success: () => `Scan on "${values.join(",")}" has been launched.`,
            error: (error: any) => `An error occurred: ${JSON.stringify(error)}`,
        })
    }
    return {
        launchTransform,
    }
}
