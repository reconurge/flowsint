import { supabase } from "@/lib/supabase/client";
import { useQuery } from "@supabase-cache-helpers/postgrest-swr";

export function useRelations(individualId: string | null | undefined) {
    const { data: individuals, mutate, isLoading, error } = useQuery(
        Boolean(individualId)
            ? supabase
                .from("relationships")
                .select(`
                    id,
                    individual_a(id, full_name, image_url),
                    individual_b(id, full_name, image_url),
                    relation_type,
                    confidence_level
                `)
                .or(`individual_a.eq.${individualId},individual_b.eq.${individualId}`)
            : null,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );
    const relations = individuals
        ? individuals.map((rel: { individual_a: any, individual_b: any, relation_type: string }) => {
            return rel.individual_a?.id === individualId
                ? { ...rel.individual_b, relation_type: rel.relation_type }
                : { ...rel.individual_a, relation_type: rel.relation_type }
        }).filter(Boolean)
        : [];
    return {
        relations,
        isLoading,
        refetch: mutate,
        error
    };
}
