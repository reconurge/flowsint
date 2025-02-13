"use client"
import useLocalStorage from "@/src/lib/hooks/use-local-storage";
import React, { createContext, useContext, ReactNode, useState, useCallback } from "react";
import { Button, Dialog, Flex, Switch } from "@radix-ui/themes";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { Investigation } from "@/src/types/investigation";
import { useInvestigation } from "@/src/lib/hooks/investigation/investigation";
import { ThemeSwitch } from "../theme-switch";
import { useConfirm } from "../use-confirm-dialog";
import { supabase } from "@/src/lib/supabase/client";
import FloatingEdge from "../investigations/floating-edge";
import { cn } from "@/src/lib/utils";

interface InvestigationContextType {
    filters: any,
    setFilters: any,
    settings: any,
    setSettings: any,
    setOpenSettingsModal: any,
    investigation: Investigation | null,
    isLoadingInvestigation: boolean | undefined,
    handleOpenIndividualModal: any,
    handleDeleteInvestigation: any,
    currentNode: any,
    setCurrentNode: any,
    panelOpen: boolean,
    setPanelOpen: any
}
const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

interface InvestigationProviderProps {
    children: ReactNode;
}

export const InvestigationProvider: React.FC<InvestigationProviderProps> = ({ children }) => {
    const { investigation_id } = useParams()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [panelOpen, setPanelOpen] = useLocalStorage('panel_open', false)
    const [filters, setFilters] = useLocalStorage('filters', {});
    const [currentNode, setCurrentNode] = useState<null | Node>(null)
    const { investigation, isLoading: isLoadingInvestigation } = useInvestigation(investigation_id)
    const [openSettingsModal, setOpenSettingsModal] = useState(false)
    const { confirm } = useConfirm()
    const [settings, setSettings] = useLocalStorage('settings', {
        showNodeLabel: true,
        showEdgeLabel: true,
        showMiniMap: true,
        showCopyIcon: true,
        showNodeToolbar: true,
        floatingEdges: false
    });

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString())
            params.set(name, value)

            return params.toString()
        },
        [searchParams]
    )
    const handleOpenIndividualModal = (id: string) => router.push(pathname + '?' + createQueryString('individual_id', id))

    const handleDeleteInvestigation = async () => {
        if (await confirm({ title: "Delete investigation", message: "Are you really sure you want to delete this investigation ?" })) {
            if (await confirm({ title: "Just making sure", message: "You will definetly delete all nodes, edges and relationships." })) {
                const { error } = await supabase.from("investigations").delete().eq('id', investigation_id)
                if (error) throw error
                return router.push("/dashboard")
            }
        }
    }

    const SettingSwitch = ({ setting, value, title, description, disabled = false }: { setting: string, value: boolean, title: string, description: string, disabled?: boolean }) => (
        <div className={cn("flex items-center justify-between gap-4", disabled && 'opacity-60')}>
            <div className="flex flex-col gap-1">
                <p className="font-medium">{title}</p>
                <p className="opacity-70 text-sm">
                    {description}
                </p>
            </div>
            <Switch disabled={disabled} checked={value} onCheckedChange={(val: boolean) => setSettings({ ...settings, [setting]: val })} />
        </div>
    )
    return (
        <InvestigationContext.Provider value={{ filters, setFilters, settings, setSettings, setOpenSettingsModal, investigation, isLoadingInvestigation, handleOpenIndividualModal, handleDeleteInvestigation, currentNode, setCurrentNode, panelOpen, setPanelOpen }}>
            {children}
            <Dialog.Root open={openSettingsModal}>
                <Dialog.Content maxWidth="450px">
                    <Dialog.Title>Settings</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Make changes to your settings.
                    </Dialog.Description>
                    <Flex direction="column" gap="3">
                        <SettingSwitch setting={"showNodeLabel"} value={settings.showNodeLabel} title={"Show labels on nodes"} description={"Displays the labels on the nodes, like username or avatar."} />
                        <SettingSwitch setting={"showEdgeLabel"} value={settings.showEdgeLabel} title={"Show labels on edges"} description={"Displays the labels on the edges, like relation type."} />
                        <SettingSwitch setting={"showMiniMap"} value={settings.showMiniMap} title={"Show minimap on the canva"} description={"Displays the minimap on canva."} />
                        <SettingSwitch setting={"showCopyIcon"} value={settings.showCopyIcon} title={"Show copy button on nodes"} description={"Displays a copy button on the nodes."} />
                        <SettingSwitch setting={"showNodeToolbar"} value={settings.showNodeToolbar} title={"Show toolbar on nodes"} description={"Displays a toolbar with actions on the nodes."} />
                        <SettingSwitch disabled setting={"floatingEdges"} value={settings.floatingEdges} title={"Floating edges"} description={"Edges are not stuck to one point."} />
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <p className="font-medium">Theme</p>
                                <p className="opacity-70 text-sm">
                                    Switch to dark or light mode.
                                </p>
                            </div>
                            <ThemeSwitch />
                        </div>
                    </Flex>
                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close onClick={() => setOpenSettingsModal(false)}>
                            <Button variant="soft" color="gray">
                                Cancel
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </InvestigationContext.Provider >
    );
};

export const useInvestigationContext = (): InvestigationContextType => {
    const context = useContext(InvestigationContext);
    if (!context) {
        throw new Error("useInvestigationContext must be used within a InvestigationProvider");
    }
    return context;
};