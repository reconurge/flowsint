import { supabase } from "@/lib/supabase/client";
import { useQuery } from "@supabase-cache-helpers/postgrest-swr";

export function useSketches(investigation_id: string) {
    const { data: sketches, count, mutate, isLoading, error } = useQuery(
        supabase
            .from('sketches')
            .select('id, title, description')
            .eq("investigation_id", investigation_id)
            .order("last_updated_at", { ascending: false }),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    return { sketches, count, isLoading, refetch: mutate, error };
}

export function useSketch(sketch_id: string | string[] | undefined) {
    if (!sketch_id) return { investigation: null }
    const { data: sketch, mutate, isLoading, error } = useQuery(
        supabase
            .from('sketches')
            .select('id, title, description')
            .eq("id", sketch_id)
            .single(),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );
    return { data: sketch ?? null, isLoading, refetch: mutate, error };
}