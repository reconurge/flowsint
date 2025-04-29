"use client"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { SquarePenIcon } from "lucide-react"
import { useQueryState } from "nuqs"
import { memo, useCallback, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useReactFlow } from "@xyflow/react"
import { useConfirm } from "@/components/use-confirm-dialog"
import { toast } from "sonner"
import { useFlowStore } from "@/store/flow-store"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { NodeNotesEditor } from "./node-notes-editor"
import { nodesTypes } from "@/lib/utils"
import { actionItems, type ActionItem } from "@/lib/action-items"
import { useLaunchSan } from "@/hooks/use-launch-scan"
import { DynamicForm } from "../../dynamic-form"

// Node Context Menu component
interface NodeContextMenuProps {
    x: number | undefined
    y: number | undefined
    onClose: () => void | null | undefined
}

const NodeContextMenu = memo(({ x, y, onClose }: NodeContextMenuProps) => {
    const { currentNode, setCurrentNode } = useFlowStore()
    const { addNodes, addEdges, setNodes, setEdges } = useReactFlow()
    const { sketch_id } = useParams()
    const [openAddNodeModal, setOpenNodeModal] = useState(false)
    const [error, setError] = useState<null | string>(null)
    const [openNote, setOpenNote] = useState(false)
    const [loading, setLoading] = useState(false)
    const [nodeToInsert, setNodeToInsert] = useState<any | null>(null)
    const { confirm } = useConfirm()
    const [_, setIndividualId] = useQueryState("individual_id")
    const { launchScan } = useLaunchSan()

    const _handleDeleteNode = async (type: string) => {
        try {
            if (!currentNode) return
            if (await confirm({ title: "Node deletion", message: "Are you sure you want to delete this node?" })) {
                await supabase
                    .from(`${currentNode?.data?.type}s`)
                    .delete()
                    .eq("id", currentNode.id)
                    .then(({ error }) => {
                        if (error) toast.error(error.details)
                    })
                setNodes((nodes: any[]) => nodes.filter((node: { id: any }) => node.id !== currentNode?.id?.toString()))
                setEdges((edges: any[]) => edges.filter((edge: { source: any }) => edge.source !== currentNode?.id?.toString()))
                onClose()
            }
            toast.success("Node deleted.")
        }
        catch (e) {
            toast.error("An error occured deleting the node.")
        }
    }

    const handleDeleteNode = useCallback(_handleDeleteNode, [currentNode?.id, setNodes, setEdges, confirm, onClose])

    const handleOpenAddNodeModal = (e: { stopPropagation: () => void }, key: string) => {
        e.stopPropagation()
        if (!currentNode) return
        if (!nodesTypes[key as keyof typeof nodesTypes]) {
            toast.error("Invalid node type.")
            return
        }
        setNodeToInsert(nodesTypes[key as keyof typeof nodesTypes])
        setError(null)
        setOpenNodeModal(true)
    }

    const handleAddNode = async (data: any) => {
        try {
            setLoading(true)
            if (!currentNode) {
                toast.error("No node detected.")
                setLoading(false)
                return
            }
            const dataToInsert = { ...data, sketch_id: sketch_id }
            if (!["individual", "organization"].includes(nodeToInsert.type)) {
                const tp = currentNode?.data?.type === "individual" ? "individual_id" : "organization_id"
                dataToInsert[tp] = currentNode.id
            }
            const { data: nodeData, error: insertError } = await supabase
                .from(nodeToInsert.table)
                .insert(dataToInsert)
                .select("*")
                .single()
            if (insertError || !nodeData) {
                toast.error("An error occured during the creation." + JSON.stringify(insertError))
                setLoading(false)
                return
            }
            // add individual to individual
            if (nodeToInsert.type === "individual" && currentNode?.data?.type === "individual") {
                const { error: relationshipError } = await supabase.from("individuals_individuals").upsert({
                    individual_a: currentNode.id,
                    individual_b: nodeData.id,
                    sketch_id: sketch_id,
                    relation_type: "relation",
                })
                if (relationshipError) {
                    toast.error("Error creating new relation.")
                }
            }
            // add organization to individual
            else if ((nodeToInsert.type === "individual" && currentNode?.data?.type === "organization")) {
                const { error: relationshipError } = await supabase.from("organizations_individuals").upsert({
                    individual_id: nodeData.id,
                    organization_id: currentNode.id,
                    sketch_id: sketch_id,
                    relation_type: "employee",
                })
                if (relationshipError) {
                    toast.error("Error creating new relation.")
                }
            }
            // add individual to organization
            else if ((nodeToInsert.type === "organization" && currentNode?.data?.type === "individual")) {
                const { error: relationshipError } = await supabase.from("organizations_individuals").upsert({
                    individual_id: currentNode.id,
                    organization_id: nodeData.id,
                    sketch_id: sketch_id,
                    relation_type: "employee",
                })
                if (relationshipError) {
                    toast.error("Error creating new relation.")
                }
            }
            // add organization to organization
            else if ((nodeToInsert.type === "organization" && currentNode?.data?.type === "organization")) {
                const { error: relationshipError } = await supabase.from("organizations_organizations").upsert({
                    organization_a: currentNode.id,
                    organization_b: nodeData.id,
                    sketch_id: sketch_id,
                })
                if (relationshipError) {
                    toast.error("Error creating new relation.")
                }
            }
            const newNode = {
                id: nodeData.id,
                type: "custom",
                data: { ...nodeData, label: data[nodeToInsert.fields[0]], type: nodeToInsert.type },
                position: { x: 0, y: 0 },
            }
            addNodes(newNode)
            if (currentNode.id) {
                const newEdge = {
                    source: currentNode.id as string,
                    target: nodeData.id,
                    type: "custom",
                    id: `${currentNode.id} - ${nodeData.id}`.toString(),
                    label: nodeToInsert.type === "individual" ? "relation" : nodeToInsert.type,
                }
                addEdges(newEdge)
            }
            setOpenNodeModal(false)
            setError(null)
            setTimeout(() => {
                setCurrentNode(nodeData)
                setLoading(false)
            }, 0)
            toast.success(`New ${nodeToInsert.type || "node"} created.`)
        } catch (error) {
            toast.error("An unexpected error occurred.")
            setLoading(false)
        }
    }

    const handleEditClick = useCallback(
        () => setIndividualId(currentNode?.id as string),
        [currentNode?.id, setIndividualId],
    )
    const handleDeleteClick = useCallback(
        () => handleDeleteNode(currentNode?.type as string),
        [currentNode?.type, handleDeleteNode],
    )
    const handleNoteClick = useCallback(() => setOpenNote(true), [setOpenNote])

    // Render a dropdown menu item with the current node's ID
    const renderMenuItem = (item: ActionItem) => {
        const Icon = item.icon

        if (item.children) {
            return (
                <DropdownMenuSub key={item.id}>
                    <DropdownMenuSubTrigger>
                        <Icon className="mr-3 h-4 w-4 opacity-50" />
                        {item.label}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        {item.children.map((childItem) => renderMenuItem(childItem))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            )
        }

        return (
            <DropdownMenuItem
                key={item.id}
                disabled={item.disabled}
                onClick={(e) => handleOpenAddNodeModal(e, item.key)}
                className="flex items-center"
            >
                <Icon className="mr-2 h-4 w-4 opacity-70" />
                <span className="truncate">{item.label}</span>
                {item.comingSoon && (
                    <Badge variant="outline" className="ml-2">
                        soon
                    </Badge>
                )}
            </DropdownMenuItem>
        )
    }

    if (!currentNode) return null

    return (
        <>
            <DropdownMenu open={Boolean(currentNode) && Boolean(x) && Boolean(y)} onOpenChange={onClose}>
                <DropdownMenuContent
                    className="absolute z-50 min-w-40 max-w-48 bg-popover text-popover-foreground rounded-md border shadow py-1 overflow-hidden"
                    style={{ top: y, left: x }}
                >
                    {Boolean(currentNode?.data?.email) && (
                        <DropdownMenuItem onClick={() => launchScan("email", [currentNode?.data?.email as string], sketch_id as string)}>Search {nodeToInsert}</DropdownMenuItem>
                    )}
                    {Boolean(currentNode?.data?.username) && (
                        <DropdownMenuItem onClick={() => launchScan("username", [currentNode?.data?.username as string], sketch_id as string)}>Search {nodeToInsert}</DropdownMenuItem>
                    )}
                    {["individual", "organization"].includes(currentNode?.data?.type as string) && (
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>New</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="grid grid-cols-1 md:grid-cols-2 gap-2">{actionItems.map((item) => renderMenuItem(item))}</DropdownMenuSubContent>
                        </DropdownMenuSub>)}
                    <DropdownMenuItem onClick={handleEditClick}>View and edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleNoteClick}>
                        New note
                        <SquarePenIcon className="ml-2 h-4 w-4" />
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                        Delete
                        <span className="ml-auto text-xs text-muted-foreground">⌘ ⌫</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={openAddNodeModal && nodeToInsert} onOpenChange={setOpenNodeModal}>
                <DialogContent>
                    <DialogTitle>New {nodeToInsert?.type}</DialogTitle>
                    <DialogDescription>Add a new related {nodeToInsert?.type}.</DialogDescription>
                    <DynamicForm
                        type={nodeToInsert?.type}
                        isForm={true}
                        loading={loading}
                        onSubmit={handleAddNode}
                    />
                </DialogContent>
            </Dialog>
            {currentNode.id && (
                <NodeNotesEditor openNote={openNote} setOpenNote={setOpenNote} individualId={currentNode.id} />
            )}
        </>
    )
})

export default NodeContextMenu

