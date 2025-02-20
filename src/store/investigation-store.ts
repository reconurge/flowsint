"use client"

import React from "react"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Investigation } from "@/types/investigation"
import { useIndividuals } from "@/lib/hooks/investigation/use-individuals"
import { useEmails } from "@/lib/hooks/investigation/use-emails"
import { usePhones } from "@/lib/hooks/investigation/use-phones"
import { useSocials } from "@/lib/hooks/investigation/use-socials"

interface InvestigationState {
    filters: any
    setFilters: (filters: any) => void
    settings: any
    setSettings: (settings: any) => void
    openSettingsModal: boolean
    setOpenSettingsModal: (open: boolean) => void
    investigation: Investigation | null
    setInvestigation: (investigation: Investigation | null) => void
    isLoadingInvestigation: boolean | undefined
    setIsLoadingInvestigation: (isLoading: boolean | undefined) => void
    handleOpenIndividualModal: (id: string) => void
    setHandleOpenIndividualModal: (handler: (id: string) => void) => void
    handleDeleteInvestigation: () => Promise<void>
    setHandleDeleteInvestigation: (handler: () => Promise<void>) => void
    currentNode: any
    setCurrentNode: (node: any) => void
    panelOpen: boolean
    setPanelOpen: (open: boolean) => void
    individuals: any[]
    setIndividuals: (individuals: any[]) => void
    isLoadingIndividuals: boolean
    setIsLoadingIndividuals: (isLoading: boolean) => void
    refetchIndividuals: () => void
    setRefetchIndividuals: (refetch: () => void) => void
    emails: any[]
    setEmails: (emails: any[]) => void
    isLoadingEmails: boolean
    setIsLoadingEmails: (isLoading: boolean) => void
    refetchEmails: () => void
    setRefetchEmails: (refetch: () => void) => void
    phones: any[]
    setPhones: (phones: any[]) => void
    isLoadingPhones: boolean
    setIsLoadingPhones: (isLoading: boolean) => void
    refetchPhones: () => void
    setRefetchPhones: (refetch: () => void) => void
    socials: any[]
    setSocials: (socials: any[]) => void
    isLoadingSocials: boolean
    setIsLoadingSocials: (isLoading: boolean) => void
    refetchSocials: () => void
    setRefetchSocials: (refetch: () => void) => void
}

const isServer = typeof window === "undefined"

export const useInvestigationStore = create(
    persist<InvestigationState>(
        (set, get) => ({
            filters: {},
            setFilters: (filters) => set({ filters }),
            settings: {
                showNodeLabel: true,
                showEdgeLabel: true,
                showMiniMap: true,
                showCopyIcon: true,
                showNodeToolbar: true,
            },
            setSettings: (settings) => set({ settings }),
            openSettingsModal: false,
            setOpenSettingsModal: (open) => set({ openSettingsModal: open }),
            investigation: null,
            setInvestigation: (investigation) => set({ investigation }),
            isLoadingInvestigation: undefined,
            setIsLoadingInvestigation: (isLoading) => set({ isLoadingInvestigation: isLoading }),
            handleOpenIndividualModal: () => { },
            setHandleOpenIndividualModal: (handler) => set({ handleOpenIndividualModal: handler }),
            handleDeleteInvestigation: async () => { },
            setHandleDeleteInvestigation: (handler) => set({ handleDeleteInvestigation: handler }),
            currentNode: null,
            setCurrentNode: (node) => set({ currentNode: node }),
            panelOpen: false,
            setPanelOpen: (open) => set({ panelOpen: open }),
            individuals: [],
            setIndividuals: (individuals) => set({ individuals }),
            isLoadingIndividuals: true,
            setIsLoadingIndividuals: (isLoading) => set({ isLoadingIndividuals: isLoading }),
            refetchIndividuals: () => { },
            setRefetchIndividuals: (refetch) => set({ refetchIndividuals: refetch }),
            emails: [],
            setEmails: (emails) => set({ emails }),
            isLoadingEmails: true,
            setIsLoadingEmails: (isLoading) => set({ isLoadingEmails: isLoading }),
            refetchEmails: () => { },
            setRefetchEmails: (refetch) => set({ refetchEmails: refetch }),
            phones: [],
            setPhones: (phones) => set({ phones }),
            isLoadingPhones: true,
            setIsLoadingPhones: (isLoading) => set({ isLoadingPhones: isLoading }),
            refetchPhones: () => { },
            setRefetchPhones: (refetch) => set({ refetchPhones: refetch }),
            socials: [],
            setSocials: (socials) => set({ socials }),
            isLoadingSocials: true,
            setIsLoadingSocials: (isLoading) => set({ isLoadingSocials: isLoading }),
            refetchSocials: () => { },
            setRefetchSocials: (refetch) => set({ refetchSocials: refetch }),
        }),
        {
            name: "investigation-storage",
            storage: createJSONStorage(() => (isServer ? localStorage : localStorage)),
            // @ts-ignore
            partialize: (state) => ({
                // Only persist these fields
                filters: state.filters,
                settings: state.settings,
                investigation: state.investigation,
                individuals: state.individuals,
                emails: state.emails,
                phones: state.phones,
                socials: state.socials
            }),
        },
    ),
)

export const useInvestigationData = (investigation_id: string) => {
    const {
        setIndividuals,
        setIsLoadingIndividuals,
        setRefetchIndividuals,
        setEmails,
        setIsLoadingEmails,
        setRefetchEmails,
        setPhones,
        setIsLoadingPhones,
        setRefetchPhones,
        setSocials,
        setIsLoadingSocials,
        setRefetchSocials,
    } = useInvestigationStore()

    const { individuals, isLoading: isLoadingIndividuals, refetch: refetchIndividuals } = useIndividuals(investigation_id)
    const { emails, isLoading: isLoadingEmails, refetch: refetchEmails } = useEmails(investigation_id)
    const { phones, isLoading: isLoadingPhones, refetch: refetchPhones } = usePhones(investigation_id)
    const { socials, isLoading: isLoadingSocials, refetch: refetchSocials } = useSocials(investigation_id)

    React.useEffect(() => {
        setIndividuals(individuals || [])
        setIsLoadingIndividuals(isLoadingIndividuals)
        setRefetchIndividuals(() => refetchIndividuals)
    }, [
        individuals,
        isLoadingIndividuals,
        refetchIndividuals,
        setIndividuals,
        setIsLoadingIndividuals,
        setRefetchIndividuals,
    ])

    React.useEffect(() => {
        setEmails(emails || [])
        setIsLoadingEmails(isLoadingEmails)
        setRefetchEmails(() => refetchEmails)
    }, [emails, isLoadingEmails, refetchEmails, setEmails, setIsLoadingEmails, setRefetchEmails])

    React.useEffect(() => {
        setPhones(phones || [])
        setIsLoadingPhones(isLoadingPhones)
        setRefetchPhones(() => refetchPhones)
    }, [phones, isLoadingPhones, refetchPhones, setPhones, setIsLoadingPhones, setRefetchPhones])

    React.useEffect(() => {
        setSocials(socials || [])
        setIsLoadingSocials(isLoadingSocials)
        setRefetchSocials(() => refetchSocials)
    }, [socials, isLoadingSocials, refetchSocials, setSocials, setIsLoadingSocials, setRefetchSocials])
}

