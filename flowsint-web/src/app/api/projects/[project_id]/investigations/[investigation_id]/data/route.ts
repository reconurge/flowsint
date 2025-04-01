import { createClient } from "@/lib/supabase/server"
import type { NodeData, EdgeData } from "@/types"
import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ investigation_id: string }> }) {
    const { investigation_id } = await params
    const supabase = await createClient()
    try {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        } const { data: individuals, error: indError } = await supabase
            .from("individuals")
            .select("*, ip_addresses(*), phone_numbers(*), social_accounts(*), emails(*), physical_addresses(*), group_id")
            .eq("investigation_id", investigation_id)
        const { data: groups, error: groupsError } = await supabase
            .from("groups")
            .select("*")
            .eq("investigation_id", investigation_id)
        if (groupsError) {
            return NextResponse.json({ error: groupsError.message }, { status: 500 })
        }
        if (indError) {
            return NextResponse.json({ error: indError.message }, { status: 500 })
        }
        if (!individuals || individuals.length === 0) {
            return NextResponse.json({ nodes: [], edges: [] })
        }
        // Extraire les IDs des individus
        const individualIds = individuals.map((ind) => ind.id)
        // Récupérer les relations
        const { data: relations, error: relError } = await supabase
            .from("relationships")
            .select("id, individual_a, individual_b, relation_type, confidence_level")
            .in("individual_a", individualIds)
            .in("individual_b", individualIds)
        if (relError) {
            return NextResponse.json({ error: relError.message }, { status: 500 })
        }
        const nodes: NodeData[] = []
        const edges: EdgeData[] = []
        groups?.forEach(({ label, id }) => {
            nodes.push({
                id: id.toString(),
                position: { x: 200, y: 200 },
                data: { label: label.toString() },
                type: "group",
                width: 380,
                height: 200,
            })
        })
        // Construire les nœuds et les arêtes
        individuals.forEach((ind: any) => {
            const individualId = ind.id.toString()
            nodes.push({
                id: individualId,
                type: "individual",
                data: { ...ind, label: ind.full_name },
                position: { x: 0, y: 100 },
                parentId: ind.group_id?.toString(),
                extent: "parent",
            })
            // Ajouter les emails
            ind.emails?.forEach((email: any) => {
                nodes.push({
                    id: email.id.toString(),
                    type: "email",
                    data: { ...email, label: email.email },
                    position: { x: 100, y: 100 },
                })
                edges.push({
                    source: individualId,
                    target: email.id.toString(),
                    type: "custom",
                    id: `${individualId}-${email.id}`.toString(),
                    label: "email",
                })
            })
            // Ajouter les numéros de téléphone
            ind.phone_numbers?.forEach((phone: any) => {
                nodes.push({
                    id: phone.id.toString(),
                    type: "phone",
                    data: { ...phone, label: phone.phone_number },
                    position: { x: -100, y: 100 },
                })
                edges.push({
                    source: individualId,
                    target: phone.id.toString(),
                    type: "custom",
                    id: `${individualId}-${phone.id}`.toString(),
                    label: "phone",
                })
            })
            // Ajouter les comptes sociaux
            ind.social_accounts?.forEach((social: any) => {
                nodes.push({
                    id: social.id.toString(),
                    type: "social",
                    data: { ...social, label: `${social.platform}: ${social.username}` },
                    position: { x: 100, y: -100 },
                })
                edges.push({
                    source: individualId,
                    target: social.id.toString(),
                    type: "custom",
                    id: `${individualId}-${social.id}`.toString(),
                    label: "social",
                })
            })
            // Ajouter les adresses IP
            ind.ip_addresses?.forEach((ip: any) => {
                nodes.push({
                    id: ip.id.toString(),
                    type: "ip",
                    data: { label: ip.ip_address },
                    position: { x: -100, y: -100 },
                })
                edges.push({
                    source: individualId,
                    target: ip.id.toString(),
                    type: "custom",
                    id: `${individualId}-${ip.id}`.toString(),
                    label: "IP",
                })
            })
            // Ajouter les adresses physiques
            ind.physical_addresses?.forEach((address: any) => {
                nodes.push({
                    id: address.id.toString(),
                    type: "address",
                    data: { ...address, label: [address.address, address.city, address.country].join(", ") },
                    position: { x: 100, y: 100 },
                })
                edges.push({
                    source: individualId,
                    target: address.id.toString(),
                    type: "custom",
                    id: `${individualId}-${address.id}`.toString(),
                    label: "address",
                })
            })
        })
        // Ajouter les relations entre individus
        relations?.forEach(({ id, individual_a, individual_b, relation_type, confidence_level }) => {
            edges.push({
                source: individual_a.toString(),
                target: individual_b.toString(),
                type: "custom",
                id: id.toString(),
                label: relation_type,
                confidence_level,
            })
        })
        return NextResponse.json({ nodes, edges })
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

