"use client"

import createWithEqualityFn from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { useQuery, type QueryObserverResult } from "@tanstack/react-query"
import type { Investigation, Individual, Email, Phone, Social, IP, Relation, Address } from "@/types/investigation"

// Define a generic type for query results
interface QueryResult<T> {
    data: T
    isLoading: boolean
    refetch: () => Promise<void>
}

// Define the return type for useInvestigationData
interface InvestigationData {
    investigation: QueryResult<Investigation>
    individuals: QueryResult<Individual[]>
    emails: QueryResult<Email[]>
    phones: QueryResult<Phone[]>
    socials: QueryResult<Social[]>
    ips: QueryResult<IP[]>
    addresses: QueryResult<Address[]>
    relations: QueryResult<Relation[]>
}

interface InvestigationState {
    // UI State
    filters: any
    settings: {
        showNodeLabel: boolean
        showEdgeLabel: boolean
        showMiniMap: boolean
        showCopyIcon: boolean
        showNodeToolbar: boolean
    }
    openSettingsModal: boolean
    currentNode: any
    panelOpen: boolean
    openNewNode: boolean,
    investigation: Investigation | null
    isRefetching: boolean

    // UI Actions
    setFilters: (filters: any) => void
    setSettings: (settings: any) => void
    setOpenSettingsModal: (open: boolean) => void
    setOpenNewNode: (open: boolean) => void
    setCurrentNode: (node: any) => void
    setPanelOpen: (open: boolean) => void
    setInvestigation: (investigation: Investigation | null) => void

    // Modal Handlers
    handleOpenIndividualModal: (id: string) => void
    setHandleOpenIndividualModal: (handler: (id: string) => void) => void
    handleDeleteInvestigation: () => Promise<void>
    setHandleDeleteInvestigation: (handler: () => Promise<void>) => void

    // Query Hooks
    useInvestigationData: (projectId: string, investigationId: string) => InvestigationData & {
        refetchAll: () => Promise<void>
    }
}

const isServer = typeof window === "undefined"

export const useInvestigationStore = createWithEqualityFn(
    persist<InvestigationState>(
        (set, get) => ({
            // UI State
            filters: {},
            settings: {
                showNodeLabel: true,
                showEdgeLabel: true,
                showMiniMap: true,
                showCopyIcon: true,
                showNodeToolbar: true,
            },
            openSettingsModal: false,
            currentNode: null,
            openNewNode: false,
            panelOpen: false,
            investigation: null,
            isRefetching: false,
            // UI Actions
            setFilters: (filters) => set({ filters }),
            setSettings: (settings) => set({ settings }),
            setOpenSettingsModal: (open) => set({ openSettingsModal: open }),
            setOpenNewNode: (open) => set({ openNewNode: open }),
            setCurrentNode: (node) => set({ currentNode: node }),
            setPanelOpen: (open) => set({ panelOpen: open }),
            setInvestigation: (investigation) => set({ investigation }),
            handleOpenIndividualModal: () => { },
            setHandleOpenIndividualModal: (handler) => set({ handleOpenIndividualModal: handler }),
            handleDeleteInvestigation: async () => { },
            setHandleDeleteInvestigation: (handler) => set({ handleDeleteInvestigation: handler }),
            useInvestigationData: (projectId: string, investigationId: string) => {
                const wrapRefetch = async (refetch: () => Promise<QueryObserverResult>) => {
                    await refetch()
                }

                const investigationQuery = useQuery<Investigation>({
                    queryKey: ["projects", projectId, "investigation", investigationId, 'investigation'],
                    queryFn: async () => {
                        const res = await fetch(`/api/projects/${projectId}/investigations/${investigationId}`)
                        if (!res.ok) throw new Error("Failed to fetch investigation")
                        const data = await res.json()
                        return data.investigation as Investigation
                    },
                })

                const individualsQuery = useQuery<Individual[]>({
                    queryKey: ["projects", projectId, "investigation", investigationId, "individuals"],
                    queryFn: async () => {
                        const res = await fetch(`/api/projects/${projectId}/investigations/${investigationId}/individuals`)
                        if (!res.ok) throw new Error("Failed to fetch individuals")
                        const data = await res.json()
                        return data.individuals
                    },
                })

                const emailsQuery = useQuery<Email[]>({
                    queryKey: ["projects", projectId, "investigation", investigationId, "emails"],
                    queryFn: async () => {
                        const res = await fetch(`/api/projects/${projectId}/investigations/${investigationId}/emails`)
                        if (!res.ok) throw new Error("Failed to fetch emails")
                        const data = await res.json()
                        return data.emails
                    },
                })

                const phonesQuery = useQuery<Phone[]>({
                    queryKey: ["projects", projectId, "investigation", investigationId, "phones"],
                    queryFn: async () => {
                        const res = await fetch(`/api/projects/${projectId}/investigations/${investigationId}/phones`)
                        if (!res.ok) throw new Error("Failed to fetch phones")
                        const data = await res.json()
                        return data.phones
                    },
                })

                const socialsQuery = useQuery<Social[]>({
                    queryKey: ["investigation", investigationId, "socials"],
                    queryFn: async () => {
                        const res = await fetch(`/api/projects/${projectId}/investigations/${investigationId}/socials`)
                        if (!res.ok) throw new Error("Failed to fetch socials")
                        const data = await res.json()
                        return data.socials
                    },
                })

                const refetchAll = async () => {
                    set({ isRefetching: true })
                    try {
                        await Promise.all([
                            individualsQuery.refetch(),
                            emailsQuery.refetch(),
                            phonesQuery.refetch(),
                            socialsQuery.refetch(),
                        ])
                    } finally {
                        set({ isRefetching: false })
                    }
                }

                return {
                    investigation: {
                        data: investigationQuery.data as Investigation,
                        isLoading: investigationQuery.isLoading,
                        refetch: () => wrapRefetch(investigationQuery.refetch),
                    },
                    individuals: {
                        data: individualsQuery.data ?? [],
                        isLoading: individualsQuery.isLoading,
                        refetch: () => wrapRefetch(individualsQuery.refetch),
                    },
                    emails: {
                        data: emailsQuery.data ?? [],
                        isLoading: emailsQuery.isLoading,
                        refetch: () => wrapRefetch(emailsQuery.refetch),
                    },
                    phones: {
                        data: phonesQuery.data ?? [],
                        isLoading: phonesQuery.isLoading,
                        refetch: () => wrapRefetch(phonesQuery.refetch),
                    },
                    socials: {
                        data: socialsQuery.data ?? [],
                        isLoading: socialsQuery.isLoading,
                        refetch: () => wrapRefetch(socialsQuery.refetch),
                    },
                    ips: {
                        data: [],
                        isLoading: false,
                        refetch: async () => { },
                    },
                    addresses: {
                        data: [],
                        isLoading: false,
                        refetch: async () => { },
                    },
                    relations: {
                        data: [],
                        isLoading: false,
                        refetch: async () => { },
                    },
                    refetchAll,
                }
            },
        }),
        {
            name: "investigation-storage",
            storage: createJSONStorage(() => (isServer ? localStorage : localStorage)),
            partialize: (state) => ({
                ...state,
            }),
        },
    )
)