import { supabase } from "@/lib/supabase/client";
import { useQuery } from "@supabase-cache-helpers/postgrest-swr";

export function useSocials(investigationId: string | null | undefined) {
    const { data: socials, mutate, isLoading, error } = useQuery(Boolean(investigationId) ?
        supabase
            .from('social_accounts')
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
        socials: socials || null,
        isLoading,
        refetch: mutate,
        error: error
    };
}

