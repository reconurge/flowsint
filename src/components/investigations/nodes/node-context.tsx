"use client"
import React, { createContext, useContext, ReactNode, useState, useCallback } from "react";
import { Button, Callout, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import { useParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import { useNodeId, useReactFlow } from "@xyflow/react";
import { InfoCircledIcon } from "@radix-ui/react-icons";

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
    "physical_addresses": { table: "physical_addresses", type: "address", fields: ["address", "city", "country", "zip"] },
}

const NodeContext = createContext<NodeContextType | undefined>(undefined);

interface NodeProviderProps {
    children: ReactNode;
}

export const NodeProvider: React.FC<NodeProviderProps> = (props: any) => {
    const { addNodes, addEdges, setNodes, setEdges } = useReactFlow();
    const { investigation_id } = useParams()
    const [openAddNodeModal, setOpenNodeModal] = useState(false)
    const [error, setError] = useState<null | string>(null)
    const [loading, setLoading] = useState(false)
    const [nodeType, setnodeType] = useState<any | null>(null)
    const nodeId = useNodeId();

    const returnError = (message: string) => {
        setLoading(false)
        setError(message)
        return
    }

    const setOpenAddNodeModal = (e: { stopPropagation: () => void; }, tableName: string) => {
        e.stopPropagation()
        // @ts-ignore
        if (!nodesTypes[tableName]) return
        // @ts-ignore
        setnodeType(nodesTypes[tableName])
        setError(null)
        setOpenNodeModal(true)
    }

    const onSubmitNewNodeModal = async (e: { preventDefault: () => void; currentTarget: HTMLFormElement | undefined; }) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        await handleAddNode(data);
    };

    const handleAddNode = async (data: any) => {
        setLoading(true)
        if (!nodeId) return returnError("No node detected.")
        const dataToInsert = { ...data, investigation_id }
        if (nodeType.table !== "individuals")
            dataToInsert["individual_id"] = nodeId
        const node = await supabase.from(nodeType.table).insert(dataToInsert).select("*")
            .single()
            .then(({ data, error }) => {
                if (error)
                    returnError(error.details)
                return data
            })
        if (!node) return
        if (nodeType.table === "individuals") {
            // create relation to investigation
            await supabase.from("investigation_individuals").insert({
                individual_id: node.id,
                investigation_id: investigation_id
            }).then(({ error }) => console.log(error))

            await supabase.from("relationships").upsert({
                individual_a: nodeId,
                individual_b: node.id,
                relation_type: "relation"
            }).then(({ error }) => { if (error) returnError(error.details) }
            )
        }
        addNodes({
            id: node.id,
            type: nodeType.type,
            data: { ...node, label: data[nodeType.fields[0]] },
            position: { x: 0, y: 0 }
        });
        if (nodeId)
            addEdges({
                source: nodeId,
                target: node.id,
                type: 'custom',
                id: `${nodeId}-${node.id}`.toString(),
                label: nodeType.type === "individual" ? "relation" : nodeType.type,
            });
        setLoading(false)
        setError(null)
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
                if (insertError) returnError(insertError.details)
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
                                return (
                                    <label key={i}>
                                        <Text as="div" size="2" mb="1" weight="bold">
                                            {key}
                                        </Text>
                                        <TextField.Root
                                            defaultValue={value || ""}
                                            // disabled={Boolean(value)}
                                            name={key}
                                            placeholder={`Your value here (${key})`}
                                        />
                                    </label>
                                )
                            })}
                        </Flex>
                        {error && <Callout.Root className="mt-4" color="red">
                            <Callout.Icon>
                                <InfoCircledIcon />
                            </Callout.Icon>
                            <Callout.Text>
                                {error}
                            </Callout.Text>
                        </Callout.Root>}
                        <Flex gap="3" mt="4" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">
                                    Cancel
                                </Button>
                            </Dialog.Close>
                            <Button loading={loading} type="submit">Save</Button>
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