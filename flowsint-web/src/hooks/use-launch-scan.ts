"use client"
import { toast } from "sonner"
import { performSearch } from "@/lib/actions/search"
import { useConfirm } from "@/components/use-confirm-dialog"
import { scans } from "@/lib/utils"
export function useLaunchSan() {
    const { confirm } = useConfirm()
    const launchScan = async (scan_name: string, values: string[], sketch_id: string) => {
        const scan = scans.find((s) => s.name === scan_name)
        if (!values.length || !scan) {
            return toast.error("The item you want to search for was not found.")
        }
        const confirmed = await confirm({
            title: `${scan.scan_name} scan`,
            message: scan.description,
        })
        if (!confirmed) return
        toast.promise(performSearch(values, scan.scan_name, sketch_id), {
            loading: "Loading...",
            success: () => `Scan on "${values.join(",")}" has been launched.`,
            error: (error: any) => `An error occurred: ${JSON.stringify(error)}`,
        })
    }
    return {
        launchScan,
    }
}
