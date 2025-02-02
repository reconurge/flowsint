"use server"
import { createClient } from "../supabase/server"
import { Investigation } from "@/src/types/investigation"
import { NodeData, EdgeData } from "@/src/types"
interface ReturnTypeGetInvestigations {
    investigations: Investigation[],
    error?: any
}
export async function getInvestigations(): Promise<ReturnTypeGetInvestigations> {
    const supabase = await createClient()
    let { data: investigations, error } = await supabase
        .from('investigations')
        .select('id, title, description')

    if (error) {
        throw error
    }
    return { investigations: investigations as Investigation[], error: error }
}
interface ReturnTypeGetInvestigation {
    investigation: Investigation,
    error?: any
}
export async function getInvestigation(investigationId: string): Promise<ReturnTypeGetInvestigation> {
    const supabase = await createClient()
    let { data: investigation, error } = await supabase
        .from('investigations')
        .select('id, title, description')
        .eq("id", investigationId)
        .single()

    if (error) {
        throw error
    }
    return { investigation: investigation as Investigation, error: error }
}

export async function getInvestigationData(investigationId: string): Promise<{ nodes: NodeData[], edges: EdgeData[] }> {
    const supabase = await createClient();
    let { data: individuals, error: indError } = await supabase
        .from('investigation_individuals')
        .select('individuals(*, ip_addresses(*), phone_numbers(*), social_accounts(*))')
        .eq('investigation_id', investigationId);
    if (indError) throw indError;
    if (!individuals) individuals = [];

    // Extraire les IDs
    const individualIds = individuals
        // @ts-ignore
        .map((ind) => ind.individuals?.id)

    if (individualIds.length === 0) {
        return { nodes: [], edges: [] };
    }

    let { data: relations, error: relError } = await supabase
        .from('relationships')
        .select('individual_a, individual_b, relation_type, confidence_level')
        .in('individual_a', individualIds)
        .in('individual_b', individualIds);

    if (relError) throw relError;
    if (!relations) relations = [];
    // Construire les nœuds
    const nodes: NodeData[] = individuals.map(({ individuals: ind }: any) => ({
        id: ind.id.toString(),
        type: 'custom',
        data: { ...ind, label: ind.full_name },
        position: { x: 0, y: 100 }

    }));

    // Construire les arêtes
    const edges: EdgeData[] = relations.flatMap(({ individual_a, individual_b, relation_type, confidence_level }) => [
        { source: individual_a.toString(), target: individual_b.toString(), type: 'custom', id: `${individual_a}-${individual_b}`.toString(), label: relation_type, confidence_level: confidence_level },
    ]);
    return { nodes, edges };
}


