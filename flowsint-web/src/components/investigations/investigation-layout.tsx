"use client"

import { useQuery } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { InvestigationNavigation } from "./investigation-navigation"
import { clientFetch } from "@/lib/client-fetch"
import { Skeleton } from "../ui/skeleton"
import { AvatarList } from "../avatar-list"
import { Profile } from "@/types"
import { Investigation } from "@/types/investigation"

interface InvestigationLayoutProps {
    investigation_id: string
    children: React.ReactNode
}

export function InvestigationLayout({ investigation_id, children }: InvestigationLayoutProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const currentTab = searchParams.get("tab") || "overview"

    // Fetch investigation data at the layout level
    const { data: investigation, isLoading } = useQuery<Investigation>({
        queryKey: [process.env.NEXT_PUBLIC_FLOWSINT_API, "dashboard", "investigations", investigation_id],
        queryFn: async () => {
            const data = await clientFetch(`${process.env.NEXT_PUBLIC_FLOWSINT_API}/investigations/${investigation_id}`)
            return data
        },
        staleTime: 1000 * 60 * 5, // Keep fresh for 5 minutes
    })

    return (
        <div className="flex flex-col min-h-screen">
            <div className="sticky z-40 bg-card top-[48px] border-b">
                <InvestigationNavigation 
                    investigation_id={investigation_id} 
                    currentTab={currentTab}
                />
            </div>
            <div className="w-full space-y-8 container mx-auto py-12 px-8">
                <div className="flex items-center justify-between">
                    <div>
                        {isLoading ? (
                            <>
                                <Skeleton className="font-semibold h-8 w-full w-72 rounded-lg" />
                                <Skeleton className="font-semibold mt-3 h-4 w-full w-102 rounded-lg" />
                            </>
                        ) : (
                            <>
                                <h1 className="font-semibold text-2xl">{investigation?.name}</h1>
                                <p className="opacity-60 mt-3">
                                    {investigation?.description ?? <span className="italic">No description provided.</span>}
                                </p>
                            </>
                        )}
                    </div>
                    <div>
                        <AvatarList
                            size="lg"
                            users={
                                investigation?.members?.map((member: { profile: Profile }) => ({
                                    ...member.profile,
                                    owner: member.profile.id === investigation.owner_id,
                                })) || []
                            }
                        />
                    </div>
                </div>
                {children}
            </div>
        </div>
    )
} 