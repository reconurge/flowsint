import { supabase } from "@/src/lib/supabase/client";
import { useQuery } from "@supabase-cache-helpers/postgrest-swr";

export function useIndividual(individualId: string | null | undefined) {
    const { data: individual, mutate, isLoading, error } = useQuery(Boolean(individualId) ?
        supabase
            .from('individuals')
            .select('*, ip_addresses(*), phone_numbers(*), social_accounts(*), emails(*)')
            .eq("id", individualId)
            .single() : null,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );
    return { individual: individual ?? null, isLoading, refetch: mutate, error };
}