"use client"
import React, { createContext, useContext, ReactNode, useState, useCallback } from "react";
import { Button, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import { useParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { useNodeId, useReactFlow } from "@xyflow/react";

interface NodeContextType {
    setOpenAddNodeModal: any,
    handleDuplicateNode: any,
    handleDeleteNode: any,
    loading: boolean
}

const nodesTypes = {
    "emails": { table: "emails", type: "email", fields: ["email"] },
    "individuals": { table: "individuals", type: "individual", fields: ["full_name"] },
    "phone_numbers": { table: "phone_numbers", type: "phone", fields: ["phone_number"] },
    "ip_addresses": { table: "ip_addresses", type: "ip", fields: ["ip_address"] },
    "social_accounts_facebook": { table: "social_accounts", type: "social", fields: ["profile_url", "username", "platform:facebook"] },
    "social_accounts_instagram": { table: "social_accounts", type: "social", fields: ["profile_url", "username", "platform:instagram"] },
    "social_accounts_telegram": { table: "social_accounts", type: "social", fields: ["profile_url", "username", "platform:telegram"] },
    "social_accounts_snapchat": { table: "social_accounts", type: "social", fields: ["profile_url", "username", "platform:snapchat"] },
    "social_accounts_signal": { table: "social_accounts", type: "social", fields: ["profile_url", "username", "platform:signal"] },
}

const NodeContext = createContext<NodeContextType | undefined>(undefined);

interface NodeProviderProps {
    children: ReactNode;
}

export const NodeProvider: React.FC<NodeProviderProps> = (props: any) => {
    const { addNodes, addEdges, setNodes, setEdges } = useReactFlow();
    const { investigation_id } = useParams()
    const [openAddNodeModal, setOpenNodeModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [nodeType, setnodeType] = useState<any | null>(null)
    const nodeId = useNodeId();

    const setOpenAddNodeModal = (tableName: string) => {
        // @ts-ignore
        if (!nodesTypes[tableName]) return
        // @ts-ignore
        setnodeType(nodesTypes[tableName])
        setOpenNodeModal(true)
    }

    const onSubmitNewNodeModal = async (e: { preventDefault: () => void; currentTarget: HTMLFormElement | undefined; }) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        const newNodeId = crypto.randomUUID()
        addNodes({
            id: newNodeId,
            type: nodeType.type,
            data: { ...data, label: data[nodeType.fields[0]] },
            position: { x: -100, y: -100 }
        });
        if (nodeId)
            addEdges({
                source: nodeId,
                target: newNodeId,
                type: 'custom',
                id: `${nodeId}-${newNodeId}`.toString(),
                label: nodeType.type,
            });
        await handleAddNode({ ...data, id: newNodeId });
    };

    const handleAddNode = async (data: any) => {
        setLoading(true)
        if (!nodeId) return alert("No node detected.")
        const dataToInsert = { ...data, investigation_id, }
        if (nodeType.table !== "individuals")
            dataToInsert["individual_id"] = nodeId
        const node = await supabase.from(nodeType.table).insert(dataToInsert).select("*")
            .single()
            .then(({ data, error }) => {
                if (error)
                    console.log(error)
                return data
            })
        if (!node) return
        if (nodeType.table === "individuals") {
            // create relation to investigation
            await supabase.from("investigation_individuals").insert({
                individual_id: node.id,
                investigation_id: investigation_id
            }).then(({ error }) => console.log(error))

            await supabase.from("relationships").insert({
                individual_a: nodeId,
                individual_b: node.id,
                relation_type: "relation"
            }).then(({ error }) => console.log(error))
        }
        setLoading(false)
        setOpenNodeModal(false)
    }

    const handleDuplicateNode = async () => {
        await supabase.from("individuals")
            .select("*")
            .eq("id", nodeId)
            .single()
            .then(async ({ data, error }) => {
                if (error) throw error
                const { data: node, error: insertError } = await supabase.from("individuals")
                    .insert({ full_name: data.full_name })
                    .select("*")
                    .single()
                if (insertError) throw error
                addNodes({
                    id: node.id,
                    type: "individual",
                    data: node,
                    position: { x: 0, y: -100 }
                });
            })
    }

    const handleDeleteNode = useCallback(async () => {
        if (!nodeId) return
        setNodes((nodes: any[]) => nodes.filter((node: { id: any; }) => node.id !== nodeId.toString()));
        setEdges((edges: any[]) => edges.filter((edge: { source: any; }) => edge.source !== nodeId.toString()));
    }, [nodeId, setNodes, setEdges]);

    return (
        <NodeContext.Provider {...props} value={{ setOpenAddNodeModal, handleDuplicateNode, handleDeleteNode, loading }}>
            {props.children}
            <Dialog.Root open={openAddNodeModal && nodeType} onOpenChange={setOpenNodeModal}>
                <Dialog.Content maxWidth="450px">
                    <Dialog.Title>New {nodeType?.type}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Add a new related {nodeType?.type}.
                    </Dialog.Description>
                    <form onSubmit={onSubmitNewNodeModal}>
                        <Flex direction="column" gap="3">
                            {nodeType?.fields.map((field: any, i: number) => {
                                const [key, value] = field.split(":")
                                console.log(Boolean(value))
                                return (
                                    <label key={i}>
                                        <Text as="div" size="2" mb="1" weight="bold">
                                            {key}
                                        </Text>
                                        <TextField.Root
                                            defaultValue={value || ""}
                                            disabled={Boolean(value)}
                                            name={key}
                                            placeholder={`Your value here (${key})`}
                                        />
                                    </label>
                                )
                            })}
                        </Flex>
                        <Flex gap="3" mt="4" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">
                                    Cancel
                                </Button>
                            </Dialog.Close>
                            <Dialog.Close>
                                <Button loading={loading} type="submit">Save</Button>
                            </Dialog.Close>
                        </Flex>
                    </form>
                </Dialog.Content>
            </Dialog.Root>
        </NodeContext.Provider>
    );
};

export const useNodeContext = (): NodeContextType => {
    const context = useContext(NodeContext);
    if (!context) {
        throw new Error("useNodeContext must be used within a NodeProvider");
    }
    return context;
};