import { supabase } from "@/lib/supabase/client";
import { useQuery } from "@supabase-cache-helpers/postgrest-swr";

export function useUsernames(investigationId: string | string[] | undefined) {
    if (!investigationId) return { usernames: [] }
    const { data: usernames, count, mutate, isLoading, error } = useQuery(
        supabase
            .from('social_accounts')
            .select('id, username')
            .eq("investigation_id", investigationId)
            .not('username', 'is', null)
            .neq('username', ''),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );
    if (error) throw error

    return { usernames, count, isLoading, refetch: mutate, error };
}