"use client"
import React, { createContext, useContext, ReactNode, useState, useCallback } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useNodeId, useReactFlow } from "@xyflow/react";
import { useConfirm } from "@/components/use-confirm-dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { NodeNotesEditor } from "../node-notes-editor";

interface NodeContextType {
    setOpenAddNodeModal: any,
    handleDuplicateNode: any,
    handleDeleteNode: any,
    loading: boolean,
    openNote: boolean,
    setOpenNote: any
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
    "social_accounts_github": { table: "social_accounts", type: "social", fields: ["profile_url", "username", "platform:github"] },
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
    const [openNote, setOpenNote] = useState(false)
    const [loading, setLoading] = useState(false)
    const [nodeType, setnodeType] = useState<any | null>(null)
    const nodeId = useNodeId();
    const { confirm } = useConfirm();

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
        if (await confirm({ title: "Node deletion", message: "Are you sure you want to delete this node ?" })) {
            await supabase.from("individuals")
                .delete()
                .eq("id", nodeId)
                .then(({ error }) => {
                    if (error) returnError(error.details)
                })
            setNodes((nodes: any[]) => nodes.filter((node: { id: any; }) => node.id !== nodeId.toString()));
            setEdges((edges: any[]) => edges.filter((edge: { source: any; }) => edge.source !== nodeId.toString()));
        }
    }, [nodeId, setNodes, setEdges]);

    return (
        <NodeContext.Provider {...props} value={{ setOpenAddNodeModal, handleDuplicateNode, handleDeleteNode, loading, openNote, setOpenNote }}>
            {props.children}
            <Dialog open={openAddNodeModal && nodeType} onOpenChange={setOpenNodeModal}>
                <DialogContent>
                    <DialogTitle>New {nodeType?.type}</DialogTitle>
                    <DialogDescription>
                        Add a new related {nodeType?.type}.
                    </DialogDescription>
                    <form onSubmit={onSubmitNewNodeModal}>
                        <div className="flex flex-col ga-3">
                            {nodeType?.fields.map((field: any, i: number) => {
                                const [key, value] = field.split(":")
                                return (
                                    <label key={i}>
                                        <p className="my-2">
                                            {key}
                                        </p>
                                        <Input
                                            defaultValue={value || ""}
                                            // disabled={Boolean(value)}
                                            name={key}
                                            placeholder={`Your value here (${key})`}
                                        />
                                    </label>
                                )
                            })}
                        </div>
                        {error &&
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                    {error}
                                </AlertDescription>
                            </Alert>}
                        <div className="flex items-center gap-2 justify-end mt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button disabled={loading} type="submit">Save</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            <NodeNotesEditor individualId={nodeId as string} />
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