"use client"
import useLocalStorage from "@/src/lib/use-local-storage";
import React, { createContext, useContext, ReactNode, useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    useDisclosure,
    cn,
    Switch,
} from "@heroui/react";
import { notFound, useParams } from "next/navigation";
import { Investigation } from "@/src/types/investigation";
import { useInvestigation } from "@/src/lib/hooks/investigation";
interface InvestigationContextType {
    filters: any,
    setFilters: any,
    settings: any,
    setSettings: any,
    handleOpenSettings: any,
    investigation: Investigation | null,
    isLoadingInvestigation: boolean | undefined
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

interface InvestigationProviderProps {
    children: ReactNode;
}

export const InvestigationProvider: React.FC<InvestigationProviderProps> = ({ children }) => {
    const [filters, setFilters] = useLocalStorage('filters', {});
    const { investigation_id } = useParams()
    const { investigation, isLoading: isLoadingInvestigation } = useInvestigation(investigation_id)
    const { isOpen: openSettingsModal, onOpen: handleOpenSettings, onOpenChange: openChangeSettingsModal } = useDisclosure();

    const [settings, setSettings] = useLocalStorage('settings', {
        showNodeLabel: true,
        showEdgeLabel: true
    });

    const SettingSwitch = ({ setting, value, title, description }: { setting: string, value: boolean, title: string, description: string }) => (
        <Switch
            isSelected={value} onValueChange={(val) => setSettings({ ...settings, [setting]: val })}
            classNames={{
                base: cn(
                    "inline-flex flex-row-reverse w-full max-w-none bg-content1 hover:bg-content2 items-center",
                    "justify-between cursor-pointer rounded-lg gap-2 p-4",
                ),
                wrapper: "p-0 h-4 overflow-visible",
                thumb: cn(
                    "w-6 h-6 border-2 shadow-lg",
                    "group-data-[hover=true]:border-primary",
                    //selected
                    "group-data-[selected=true]:ms-6",
                    // pressed
                    "group-data-[pressed=true]:w-7",
                    "group-data-[selected]:group-data-[pressed]:ms-4",
                ),
            }}
        >
            <div className="flex flex-col gap-1">
                <p className="text-medium">{title}</p>
                <p className="text-tiny text-default-400">
                    {description}
                </p>
            </div>
        </Switch>
    )
    return (
        <InvestigationContext.Provider value={{ filters, setFilters, settings, setSettings, handleOpenSettings, investigation, isLoadingInvestigation }}>
            {children}
            <Modal
                backdrop="blur"
                size="2xl" isOpen={openSettingsModal} onOpenChange={openChangeSettingsModal}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Settings</ModalHeader>
                            <ModalBody>
                                <div className="w-full flex flex-col gap-1">
                                    <SettingSwitch setting={"showNodeLabel"} value={settings.showNodeLabel} title={"Show labels on nodes"} description={"Displays the labels on the nodes, like username or avatar."} />
                                    <SettingSwitch setting={"showEdgeLabel"} value={settings.showEdgeLabel} title={"Show labels on edeges"} description={"Displays the labels on the edges, like relation type."} />
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>
                                    Close
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </InvestigationContext.Provider>
    );
};

export const useInvestigationContext = (): InvestigationContextType => {
    const context = useContext(InvestigationContext);
    if (!context) {
        throw new Error("useInvestigationContext must be used within a InvestigationProvider");
    }
    return context;
};