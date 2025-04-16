"use client"
import { toast } from "sonner"
import { performSearch } from "@/lib/actions/search"
import { useConfirm } from "@/components/use-confirm-dialog"
import { scans } from "@/lib/utils"
export function useLaunchSan() {
    const { confirm } = useConfirm()
    const launchScan = async (scan_name: string, value: string, sketch_id: string) => {
        if (!value || !scans.find((s) => s.name === scan_name)) {
            return toast.error("The item you want to search for was not found.")
        }
        const confirmed = await confirm({
            title: `${scan_name} scan`,
            message: "This scan will look for some socials that the email might be associated with. The list is not exhaustive and might return false positives.",
        })
        if (!confirmed) return
        toast.promise(performSearch(value, scan_name, sketch_id), {
            loading: "Loading...",
            success: () => `Scan on "${value}" has been launched.`,
            error: (error: any) => 'An error occurred.'
        })
    }
    return {
        launchScan,
    }
}
