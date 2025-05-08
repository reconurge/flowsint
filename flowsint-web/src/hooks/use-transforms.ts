"use client"

import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

export function useTransforms(type: string) {
    return useQuery({
        queryKey: ["transforms", type],
        queryFn: async () => {
            const response = await fetch(`/api/transforms?type=${encodeURIComponent(type)}`)
            if (!response.ok) {
                toast.error("Failed to fetch transforms")
            }
            return response.json()
        },
    })
}
