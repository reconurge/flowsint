import { supabase } from "@/src/lib/supabase/client";
import { useQuery } from "@supabase-cache-helpers/postgrest-swr";

export function useIndividuals(investigationId: string | null | undefined) {
    const { data: individuals, mutate, isLoading, error } = useQuery(Boolean(investigationId) ?
        supabase
            .from('individuals')
            .select(`
                *
            `)
            .eq("investigation_id", investigationId)
        : null,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );
    return {
        individuals: individuals || null,
        isLoading,
        refetch: mutate,
        error: error
    };
}

