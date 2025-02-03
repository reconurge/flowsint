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
        .from('individuals')
        .select('*, ip_addresses(*), phone_numbers(*), social_accounts(*), emails(*)')
        .eq('investigation_id', investigationId);
    if (indError) throw indError;
    if (!individuals) individuals = [];

    // Extraire les IDs
    // @ts-ignore
    const individualIds = individuals.map((ind) => ind.id);

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

    const nodes: NodeData[] = [];
    const edges: EdgeData[] = [];

    // Construire les nœuds des individus
    individuals.forEach((ind: any) => {
        const individualId = ind.id.toString();
        nodes.push({
            id: individualId,
            type: 'individual',
            data: { ...ind, label: ind.full_name },
            position: { x: 0, y: 100 }
        });

        // Ajouter les emails
        ind.emails?.forEach((email: any) => {
            nodes.push({
                id: email.id.toString(),
                type: 'email',
                data: { ...email, label: email.email },
                position: { x: 100, y: 100 }
            });
            edges.push({
                source: individualId,
                target: email.id.toString(),
                type: 'custom',
                id: `${individualId}-${email.id}`.toString(),
                label: 'email',
            });
        });

        // Ajouter les numéros de téléphone
        ind.phone_numbers?.forEach((phone: any) => {
            nodes.push({
                id: phone.id.toString(),
                type: 'phone',
                data: { ...phone, label: phone.phone_number },
                position: { x: -100, y: 100 }
            });
            edges.push({
                source: individualId,
                target: phone.id.toString(),
                type: 'custom',
                id: `${individualId}-${phone.id}`.toString(),
                label: 'phone',
            });
        });

        // Ajouter les comptes sociaux
        ind.social_accounts?.forEach((social: any) => {
            nodes.push({
                id: social.id.toString(),
                type: 'social',
                data: { ...social, label: `${social.platform}: ${social.username}` },
                position: { x: 100, y: -100 }
            });
            edges.push({
                source: individualId,
                target: social.id.toString(),
                type: 'custom',
                id: `${individualId}-${social.id}`.toString(),
                label: 'social',
            });
        });

        // Ajouter les adresses IP
        ind.ip_addresses?.forEach((ip: any) => {
            nodes.push({
                id: ip.id.toString(),
                type: 'ip',
                data: { label: ip.ip_address },
                position: { x: -100, y: -100 }
            });
            edges.push({
                source: individualId,
                target: ip.id.toString(),
                type: 'custom',
                id: `${individualId}-${ip.id}`.toString(),
                label: 'IP',
            });
        });
    });
    relations.forEach(({ individual_a, individual_b, relation_type, confidence_level }) => {
        edges.push({
            source: individual_a.toString(),
            target: individual_b.toString(),
            type: 'custom',
            id: `${individual_a}-${individual_b}`.toString(),
            label: relation_type,
            confidence_level: confidence_level
        });
    });

    return { nodes, edges };
}



