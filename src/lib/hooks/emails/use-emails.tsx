import { supabase } from "@/lib/supabase/client";
import { useQuery } from "@supabase-cache-helpers/postgrest-swr";

export function useEmails(investigationId: string | null | undefined) {
    const { data: emails, mutate, isLoading, error } = useQuery(Boolean(investigationId) ?
        supabase
            .from('emails')
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
        emails: emails || null,
        isLoading,
        refetch: mutate,
        error: error
    };
}

