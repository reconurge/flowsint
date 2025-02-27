import { supabase } from "@/lib/supabase/client";
import { useQuery } from "@supabase-cache-helpers/postgrest-swr";

export function usePhones(investigationId: string | null | undefined) {
    const { data: phones, mutate, isLoading, error } = useQuery(Boolean(investigationId) ?
        supabase
            .from('phone_numbers')
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
        phones: phones || null,
        isLoading,
        refetch: mutate,
        error: error
    };
}

