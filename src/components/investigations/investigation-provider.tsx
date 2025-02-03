"use client"
import useLocalStorage from "@/src/lib/use-local-storage";
import React, { createContext, useContext, ReactNode, useState } from "react";
import { Button, Dialog, Flex, Switch } from "@radix-ui/themes";
import { useParams } from "next/navigation";
import { Investigation } from "@/src/types/investigation";
import { useInvestigation } from "@/src/lib/hooks/investigation";
import { supabase } from "@/src/lib/supabase/client";
import { ThemeSwitch } from "../theme-switch";

interface InvestigationContextType {
    filters: any,
    setFilters: any,
    settings: any,
    setSettings: any,
    setOpenSettingsModal: any,
    investigation: Investigation | null,
    isLoadingInvestigation: boolean | undefined,
}
const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

interface InvestigationProviderProps {
    children: ReactNode;
}

export const InvestigationProvider: React.FC<InvestigationProviderProps> = ({ children }) => {
    const [filters, setFilters] = useLocalStorage('filters', {});
    const { investigation_id } = useParams()
    const { investigation, isLoading: isLoadingInvestigation } = useInvestigation(investigation_id)
    const [openSettingsModal, setOpenSettingsModal] = useState(false)
    const [settings, setSettings] = useLocalStorage('settings', {
        showNodeLabel: true,
        showEdgeLabel: true
    });

    const handleDeleteNode = async (id: string) => {
        await supabase.from("individuals").delete().eq("id", id)
            .then(({ data, error }) => {
                if (error)
                    alert('an error occured.')
                return data
            })
    }

    const SettingSwitch = ({ setting, value, title, description }: { setting: string, value: boolean, title: string, description: string }) => (
        <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
                <p className="font-medium">{title}</p>
                <p className="opacity-60 text-sm">
                    {description}
                </p>
            </div>
            <Switch checked={value} onCheckedChange={(val: boolean) => setSettings({ ...settings, [setting]: val })} />
        </div>
    )
    return (
        <InvestigationContext.Provider value={{ filters, setFilters, settings, setSettings, setOpenSettingsModal, investigation, isLoadingInvestigation }}>
            {children}
            <Dialog.Root open={openSettingsModal}>
                <Dialog.Content maxWidth="450px">
                    <Dialog.Title>Settings</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Make changes to your settings.
                    </Dialog.Description>
                    <Flex direction="column" gap="3">
                        <SettingSwitch setting={"showNodeLabel"} value={settings.showNodeLabel} title={"Show labels on nodes"} description={"Displays the labels on the nodes, like username or avatar."} />
                        <SettingSwitch setting={"showEdgeLabel"} value={settings.showEdgeLabel} title={"Show labels on edeges"} description={"Displays the labels on the edges, like relation type."} />
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <p className="font-medium">Theme</p>
                                <p className="opacity-60 text-sm">
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