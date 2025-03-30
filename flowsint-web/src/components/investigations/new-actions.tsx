"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, AtSign, Camera, Facebook, Github, GithubIcon, Instagram, Locate, MapPin, MessageCircleDashed, Phone, PlusIcon, Send, User } from "lucide-react"
import type React from "react" // Added import for React
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuPortal,
    DropdownMenuContent,
    DropdownMenuSubContent
} from "@/components/ui/dropdown-menu"
import { nodesTypes } from "@/lib/utils"
import { Alert, AlertTitle, AlertDescription } from "../ui/alert"
import { Badge } from "../ui/badge"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog"

export default function NewActions({ addNodes }: { addNodes: any }) {
    const { investigation_id } = useParams()
    const [openAddNodeModal, setOpenNodeModal] = useState(false)
    const [currentNodeType, setCurrentNodeType] = useState<any | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleOpenAddNodeModal = (e: { stopPropagation: () => void }, tableName: string, individualId?: string) => {
        e.stopPropagation()
        if (!nodesTypes[tableName as keyof typeof nodesTypes]) {
            toast.error("Invalid node type.")
            return
        }
        setCurrentNodeType(nodesTypes[tableName as keyof typeof nodesTypes])
        setError(null)
        setOpenNodeModal(true)
    }

    const onSubmitNewNodeModal = async (e: {
        preventDefault: () => void
        currentTarget: HTMLFormElement | undefined
    }) => {
        e.preventDefault()
        const data = Object.fromEntries(new FormData(e.currentTarget))
        await handleAddNode(data)
    }
    const handleAddNode = async (data: any) => {
        try {
            setLoading(true)
            const dataToInsert = { ...data, investigation_id }
            const { data: nodeData, error: insertError } = await supabase
                .from(currentNodeType.table)
                .insert(dataToInsert)
                .select("*")
                .single()
            if (insertError) {
                toast.error(insertError.details)
                setLoading(false)
                return
            }
            if (!nodeData) {
                toast.error("Failed to create node.")
                setLoading(false)
                return
            }
            const newNode = {
                id: nodeData.id,
                type: currentNodeType.type,
                data: { ...nodeData, label: data[currentNodeType.fields[0]] },
                position: { x: 0, y: 0 },
            }
            addNodes(newNode)
            setOpenNodeModal(false)
            setError(null)
        } catch (error) {
            toast.error("An unexpected error occurred")
        }
    }
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size={"icon"}><PlusIcon /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={(e) => handleOpenAddNodeModal(e, "individuals")}>
                        <User className="mr-2 h-4 w-4 opacity-70" /> New relation
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleOpenAddNodeModal(e, "phone_numbers")}>
                        <Phone className="mr-2 h-4 w-4 opacity-70" />
                        Phone number
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleOpenAddNodeModal(e, "physical_addresses")}>
                        <MapPin className="mr-2 h-4 w-4 opacity-70" />
                        Physical address
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleOpenAddNodeModal(e, "emails")}>
                        <AtSign className="mr-2 h-4 w-4 opacity-70" />
                        Email address
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleOpenAddNodeModal(e, "ip_addresses")}>
                        <Locate className="mr-2 h-4 w-4 opacity-70" />
                        IP address
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Social account</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={(e) => handleOpenAddNodeModal(e, "social_accounts_facebook")}>
                                    <Facebook className="mr-2 h-4 w-4 opacity-70" />
                                    Facebook
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleOpenAddNodeModal(e, "social_accounts_instagram")}>
                                    <Instagram className="mr-2 h-4 w-4 opacity-70" />
                                    Instagram
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleOpenAddNodeModal(e, "social_accounts_telegram")}>
                                    <Send className="mr-2 h-4 w-4 opacity-70" />
                                    Telegram
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleOpenAddNodeModal(e, "social_accounts_signal")}>
                                    <MessageCircleDashed className="mr-2 h-4 w-4 opacity-70" />
                                    Signal
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleOpenAddNodeModal(e, "social_accounts_snapchat")}>
                                    <Camera className="mr-2 h-4 w-4 opacity-70" />
                                    Snapchat
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleOpenAddNodeModal(e, "social_accounts_github")}>
                                    <Github className="mr-2 h-4 w-4 opacity-70" />
                                    Github
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled onClick={(e) => handleOpenAddNodeModal(e, "social_accounts_coco")}>
                                    Coco{" "}
                                    <Badge variant="outline" className="ml-2">
                                        soon
                                    </Badge>
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu >
            <Dialog open={openAddNodeModal && currentNodeType} onOpenChange={setOpenNodeModal}>
                <DialogContent>
                    <DialogTitle>New {currentNodeType?.type}</DialogTitle>
                    <DialogDescription>Add a new related {currentNodeType?.type}.</DialogDescription>
                    <form onSubmit={onSubmitNewNodeModal}>
                        <div className="flex flex-col ga-3">
                            {currentNodeType?.fields.map((field: any, i: number) => {
                                const [key, value] = field.split(":")
                                return (
                                    <label key={i}>
                                        <p className="my-2">{key}</p>
                                        <Input defaultValue={value || ""} name={key} placeholder={`Your value here (${key})`} />
                                    </label>
                                )
                            })}
                        </div>
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="flex items-center gap-2 justify-end mt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button disabled={loading} type="submit">
                                Save
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )

}

