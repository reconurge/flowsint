"use client"
import type React from "react"
import { type ReactNode, useEffect } from "react"
import { useSketchStore } from "@/store/sketch-store"
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation"
import { useConfirm } from "@/components/use-confirm-dialog"
import { supabase } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogClose, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SketchProviderProps {
    children: ReactNode
}

export const SketchProvider: React.FC<SketchProviderProps> = ({ children }) => {
    const { sketch_id, investigation_id } = useParams()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { confirm } = useConfirm()
    const {
        settings,
        setSettings,
        openSettingsModal,
        setOpenSettingsModal,
        setHandleOpenIndividualModal,
        setHandleDeleteSketch,
    } = useSketchStore()

    useEffect(() => {
        const handleDeleteSketch = async () => {
            const confirmDelete = await confirm({
                title: "Delete sketch",
                message: "Are you really sure you want to delete this sketch ?",
            })
            if (!confirmDelete) return
            const confirmFinal = await confirm({
                title: "Just making sure",
                message: "You will definitely delete all nodes, edges and relationships.",
            })
            if (!confirmFinal) return
            try {
                const { data, error } = await supabase
                    .from("sketches")
                    .delete()
                    .eq("id", sketch_id)
                    .select("id")
                if (!data || !data.length)
                    return toast.error("The sketch could not be deleted. Are you sure you are the owner ?")
                if (error)
                    return toast.error("An error occured. Try again later.")
                router.push(`/dashboard/investigations/${investigation_id}`)
                toast.success("The sketch was successfully deleted.")
            } catch (error) {
                toast.error("An error occured.")
            }
        }
        // @ts-ignore
        setHandleDeleteSketch(handleDeleteSketch)
    }, [
        sketch_id,
        router,
        pathname,
        searchParams,
        confirm,
        setHandleOpenIndividualModal,
        setHandleDeleteSketch,
    ])

    const SettingSwitch = ({
        setting,
        value,
        title,
        description,
        disabled = false,
    }: {
        setting: keyof typeof settings
        value: boolean
        title: string
        description: string
        disabled?: boolean
    }) => (
        <div className={cn("flex items-center justify-between gap-4", disabled && "opacity-60")}>
            <div className="flex flex-col gap-1">
                <p className="font-medium">{title}</p>
                <p className="opacity-70 text-sm">{description}</p>
            </div>
            <Switch
                disabled={disabled}
                checked={value}
                onCheckedChange={(val: boolean) =>
                    setSettings({ ...settings, [setting]: val })
                }
            />
        </div>
    )

    return (
        <>
            {children}
            <Dialog open={openSettingsModal} onOpenChange={setOpenSettingsModal}>
                <DialogContent>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Make changes to your settings.</DialogDescription>
                    <div className="flex flex-col gap-3">
                        <SettingSwitch
                            setting="showNodeLabel"
                            value={settings.showNodeLabel}
                            title="Show labels on nodes"
                            description="Displays the labels on the nodes, like username or avatar."
                        />
                        <SettingSwitch
                            setting="showEdgeLabel"
                            value={settings.showEdgeLabel}
                            title="Show labels on edges"
                            description="Displays the labels on the edges, like relation type."
                        />
                        <SettingSwitch
                            setting="showMiniMap"
                            value={settings.showMiniMap}
                            title="Show minimap on the canva"
                            description="Displays the minimap on canva."
                        />
                        <SettingSwitch
                            setting="showCopyIcon"
                            value={settings.showCopyIcon}
                            title="Show copy button on nodes"
                            description="Displays a copy button on the nodes."
                        />
                        <SettingSwitch
                            setting="showNodeToolbar"
                            value={settings.showNodeToolbar}
                            title="Show toolbar on nodes"
                            description="Displays a toolbar with actions on the nodes."
                        />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export const useSketchContext = useSketchStore