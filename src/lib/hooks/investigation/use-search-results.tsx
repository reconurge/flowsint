import { supabase } from "@/lib/supabase/client";
import { useQuery } from "@supabase-cache-helpers/postgrest-swr";

export function useSearchResults(search: string | undefined, investigationId: string | string[] | undefined) {
    const { data: results, count, mutate, isLoading, error } = useQuery(search ?
        supabase
            .from('individuals')
            .select('*')
            .eq("investigation_id", investigationId)
            .ilike('full_name', `%${search}%`) : null,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );
    if (error) throw error

    return { results, count, isLoading, refetch: mutate, error };
}