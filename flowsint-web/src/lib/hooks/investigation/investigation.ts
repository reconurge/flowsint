import { supabase } from "@/lib/supabase/client";
import { useQuery } from "@supabase-cache-helpers/postgrest-swr";

export function useInvestigations(project_id: string) {
    const { data: investigations, count, mutate, isLoading, error } = useQuery(
        supabase
            .from('investigations')
            .select('id, title, description')
            .eq("project_id", project_id)
            .order("last_updated_at", { ascending: false }),
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