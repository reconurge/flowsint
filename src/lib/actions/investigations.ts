"use server"
import { createClient } from "../supabase/server"
import { Investigation } from "@/types/investigation"
import { NodeData, EdgeData } from "@/types"
import { notFound, redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

interface ReturnTypeGetInvestigations {
    investigations: Investigation[],
    error?: any
}

export async function createNewCase(formData: FormData) {
    const supabase = await createClient()
    const { data: session, error: userError } = await supabase.auth.getUser()
    if (userError || !session?.user) {
        redirect('/login')
    }

    const data = {
        title: formData.get("title"),
        description: formData.get("description"),
    }
    try {
        const { data: investigation, error } = await supabase.from("investigations").insert({ ...data, owner_id: session?.user?.id }).select("id").single()
        if (error) throw error
        revalidatePath("/")
        return { success: true, id: investigation.id }
    } catch (error) {
        console.error("Error creating new case:", error)
        return { success: false, error: "Failed to create new case" }
    }
}

export async function getInvestigations(): Promise<ReturnTypeGetInvestigations> {
    const supabase = await createClient()
    let { data: investigations, error } = await supabase
        .from('investigations')
        .select('id, title, description')
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
    return { investigation: investigation as Investigation, error: error }
}

export async function getInvestigationData(investigationId: string): Promise<{ nodes: NodeData[], edges: EdgeData[] }> {
    const supabase = await createClient();
    let { data: individuals, error: indError } = await supabase
        .from('individuals')
        .select('*, ip_addresses(*), phone_numbers(*), social_accounts(*), emails(*), physical_addresses(*)')
        .eq('investigation_id', investigationId);
    if (indError) throw notFound();

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

        ind.physical_addresses?.forEach((address: any) => {
            nodes.push({
                id: address.id.toString(),
                type: 'address',
                data: { ...address, label: [address.address, address.city, address.country].join(", ") },
                position: { x: 100, y: 100 }
            });
            edges.push({
                source: individualId,
                target: address.id.toString(),
                type: 'custom',
                id: `${individualId}-${address.id}`.toString(),
                label: 'address',
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



