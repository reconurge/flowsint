import { supabase } from "@/src/lib/supabase/client";
import { useQuery } from "@supabase-cache-helpers/postgrest-swr";
import { notFound } from "next/navigation";

export function useInvestigations() {
    const { data: investigations, count, mutate, isLoading, error } = useQuery(
        supabase
            .from('investigations')
            .select('id, title, description'),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    return { investigations, count, isLoading, refetch: mutate, error };
}

export function useInvestigation(investigationId: string | string[] | undefined) {
    if (!investigationId) return { investigation: null }
    const { data: investigation, mutate, isLoading, error } = useQuery(
        supabase
            .from('investigations')
            .select('id, title, description')
            .eq("id", investigationId)
            .single(),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );
    return { investigation: investigation ?? null, isLoading, refetch: mutate, error };
}