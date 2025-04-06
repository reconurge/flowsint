import { createClient } from "@/lib/supabase/server"
import type { NodeData, EdgeData } from "@/types"
import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ investigation_id: string }> }) {
    const { investigation_id } = await params
    const supabase = await createClient()

    try {
        // Vérification de l'authentification
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (!user || userError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        // Une seule requête à la vue matérialisée
        const { data: graphData, error: graphError } = await supabase
            .from("investigation_graph")
            .select("*")
            .eq("investigation_id", investigation_id)
            .single();
        if (graphError) {
            return NextResponse.json({ error: graphError.message }, { status: 500 })
        }
        if (!graphData || !graphData.individuals || graphData.individuals.length === 0) {
            return NextResponse.json({ nodes: [], edges: [] })
        }
        const nodes: NodeData[] = []
        const edges: EdgeData[] = []
        graphData.individuals.forEach((ind: any) => {
            const individualId = ind.id.toString()
            nodes.push({
                id: individualId,
                type: "individual",
                data: { ...ind, label: ind.full_name },
                position: { x: 0, y: 100 },
                parentId: ind.group_id?.toString(),
                extent: "parent",
            })
            const relatedDataConfig = [
                {
                    dataKey: 'emails',
                    type: 'email',
                    labelField: 'email',
                    position: { x: 100, y: 100 },
                    edgeLabel: 'email'
                },
                {
                    dataKey: 'phone_numbers',
                    type: 'phone',
                    labelField: 'phone_number',
                    position: { x: -100, y: 100 },
                    edgeLabel: 'phone'
                },
                {
                    dataKey: 'social_accounts',
                    type: 'social',
                    labelField: (item: any) => `${item.platform}: ${item.username}`,
                    position: { x: 100, y: -100 },
                    edgeLabel: 'social'
                },
                {
                    dataKey: 'ip_addresses',
                    type: 'ip',
                    labelField: 'ip_address',
                    position: { x: -100, y: -100 },
                    edgeLabel: 'IP'
                },
                {
                    dataKey: 'vehicles',
                    type: 'vehicle',
                    labelField: (item: any) => `${item.plate}-${item.model || "Unknown"}`,
                    position: { x: -100, y: -100 },
                    edgeLabel: (item: any) => item.type
                },
                {
                    dataKey: 'physical_addresses',
                    type: 'address',
                    labelField: (item: any) => [item.address, item.city, item.country].join(", "),
                    position: { x: 100, y: 100 },
                    edgeLabel: 'address'
                }
            ];

            // Traiter chaque type de données associées
            relatedDataConfig.forEach(config => {
                const items = ind[config.dataKey];
                if (!items || !items.length) return;

                items.forEach((item: any) => {
                    // Déterminer le label
                    let label;
                    if (typeof config.labelField === 'function') {
                        label = config.labelField(item);
                    } else {
                        label = item[config.labelField];
                    }

                    // Ajouter le nœud
                    nodes.push({
                        id: item.id.toString(),
                        type: config.type,
                        data: { ...item, label },
                        position: config.position,
                    });

                    // Déterminer l'étiquette de l'arête
                    let edgeLabel;
                    if (typeof config.edgeLabel === 'function') {
                        edgeLabel = config.edgeLabel(item);
                    } else {
                        edgeLabel = config.edgeLabel;
                    }

                    // Ajouter l'arête
                    edges.push({
                        source: individualId,
                        target: item.id.toString(),
                        type: "custom",
                        id: `${individualId}-${item.id}`.toString(),
                        label: edgeLabel,
                    });
                });
            });
        });
        graphData.relationships?.forEach(({ id, individual_a, individual_b, relation_type, confidence_level }: any) => {
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