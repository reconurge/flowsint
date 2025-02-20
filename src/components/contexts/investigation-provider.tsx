"use client"
import type React from "react"
import { type ReactNode, useEffect } from "react"
import { useInvestigationStore } from "@/store/investigation-store"
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation"
import { useInvestigation } from "@/lib/hooks/investigation/investigation"
import { useConfirm } from "@/components/use-confirm-dialog"
import { supabase } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogClose, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface InvestigationProviderProps {
    children: ReactNode
}

export const InvestigationProvider: React.FC<InvestigationProviderProps> = ({ children }) => {
    const { investigation_id } = useParams()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { confirm } = useConfirm()
    const { investigation, isLoading: isLoadingInvestigation } = useInvestigation(investigation_id)

    const {
        settings,
        setSettings,
        openSettingsModal,
        setOpenSettingsModal,
        setInvestigation,
        setIsLoadingInvestigation,
        setHandleOpenIndividualModal,
        setHandleDeleteInvestigation,
    } = useInvestigationStore()

    useEffect(() => {
        setInvestigation(investigation)
        setIsLoadingInvestigation(isLoadingInvestigation)

        const createQueryString = (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString())
            params.set(name, value)
            return params.toString()
        }

        const handleOpenIndividualModal = (id: string) =>
            router.push(pathname + "?" + createQueryString("individual_id", id))

        setHandleOpenIndividualModal(() => handleOpenIndividualModal)

        const handleDeleteInvestigation = async () => {
            if (
                await confirm({
                    title: "Delete investigation",
                    message: "Are you really sure you want to delete this investigation ?",
                })
            ) {
                if (
                    await confirm({
                        title: "Just making sure",
                        message: "You will definitely delete all nodes, edges and relationships.",
                    })
                ) {
                    const { error } = await supabase.from("investigations").delete().eq("id", investigation_id)
                    if (error) throw error
                    return router.push("/dashboard")
                }
            }
        }

        setHandleDeleteInvestigation(handleDeleteInvestigation)
    }, [
        investigation,
        isLoadingInvestigation,
        investigation_id,
        router,
        pathname,
        searchParams,
        confirm,
        setInvestigation,
        setIsLoadingInvestigation,
        setHandleOpenIndividualModal,
        setHandleDeleteInvestigation,
    ])

    const SettingSwitch = ({
        setting,
        value,
        title,
        description,
        disabled = false,
    }: { setting: string; value: boolean; title: string; description: string; disabled?: boolean }) => (
        <div className={cn("flex items-center justify-between gap-4", disabled && "opacity-60")}>
            <div className="flex flex-col gap-1">
                <p className="font-medium">{title}</p>
                <p className="opacity-70 text-sm">{description}</p>
            </div>
            <Switch
                disabled={disabled}
                checked={value}
                onCheckedChange={(val: boolean) => setSettings({ ...settings, [setting]: val })}
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
                            setting={"showNodeLabel"}
                            value={settings.showNodeLabel}
                            title={"Show labels on nodes"}
                            description={"Displays the labels on the nodes, like username or avatar."}
                        />
                        <SettingSwitch
                            setting={"showEdgeLabel"}
                            value={settings.showEdgeLabel}
                            title={"Show labels on edges"}
                            description={"Displays the labels on the edges, like relation type."}
                        />
                        <SettingSwitch
                            setting={"showMiniMap"}
                            value={settings.showMiniMap}
                            title={"Show minimap on the canva"}
                            description={"Displays the minimap on canva."}
                        />
                        <SettingSwitch
                            setting={"showCopyIcon"}
                            value={settings.showCopyIcon}
                            title={"Show copy button on nodes"}
                            description={"Displays a copy button on the nodes."}
                        />
                        <SettingSwitch
                            setting={"showNodeToolbar"}
                            value={settings.showNodeToolbar}
                            title={"Show toolbar on nodes"}
                            description={"Displays a toolbar with actions on the nodes."}
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

export const useInvestigationContext = useInvestigationStore

