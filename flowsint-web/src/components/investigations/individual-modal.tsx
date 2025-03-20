"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { useIndividual } from "@/lib/hooks/individuals/use-individual"
import { useEmailsAndBreaches } from "@/lib/hooks/individuals/use-emails-breaches"
import { useRelations } from "@/lib/hooks/individuals/use-relations"
import { usePlatformIcons } from "@/lib/hooks/use-platform-icons"
import { supabase } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Pencil, X, Plus, Trash2 } from "lucide-react"
import Breaches from "../breach"
import { useQueryState } from "nuqs"
import { Building2, Mail, MapPin, Phone, User } from "lucide-react"
import Image from "next/image"
const IndividualModal = () => {
    const [individualId, setIndividualId] = useQueryState("individual_id")
    const { individual, isLoading } = useIndividual(individualId)
    const { emails, isLoading: isLoadingEmails } = useEmailsAndBreaches(individualId)
    const platformsIcons = usePlatformIcons("medium")
    const { relations, isLoading: isLoadingRelations } = useRelations(individualId)
    const [editMode, setEditMode] = useState(false)
    const [image, setImage] = useState<string | null>("")
    const [phones, setPhones] = useState([""])
    const [accounts, setAccounts] = useState([""])
    const [ips, setIps] = useState([""])

    useEffect(() => {
        setPhones(individual?.phone_numbers.map(({ phone_number }: any) => phone_number) || [""])
        setIps(individual?.ip_addresses.map(({ ip_address }: any) => ip_address) || [""])
        setAccounts(individual?.social_accounts || [""])
        setImage(individual?.image_url)
    }, [individual])

    const handleCloseModal = () => {
        setEditMode(false)
        setIndividualId(null)
    }

    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const formContent = Object.fromEntries(formData.entries())
        const { data } = await supabase
            .from("individuals")
            .update({ ...formContent, birth_date: null })
            .eq("id", individualId)
            .select("image_url")
            .single()
        setImage(data?.image_url)
        setEditMode(false)
    }

    const handleAddField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setEditMode(true)
        setter((prev) => [...prev, ""])
    }

    const handleRemoveField = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter((prev) => prev.filter((_, i) => i !== index))
    }

    const handleFieldChange = (index: number, value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        setter((prev) => prev.map((item, i) => (i === index ? value : item)))
    }

    if (!isLoading && !individual) {
        return (
            <Dialog open={Boolean(individualId)} onOpenChange={handleCloseModal}>
                <DialogContent>
                    <DialogTitle>No data</DialogTitle>
                    <DialogDescription>No data found for this individual.</DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseModal}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }
    return (
        <Dialog open={Boolean(individualId)} onOpenChange={handleCloseModal}>
            <DialogContent className="sm:max-w-[70vw] h-[90vh] overflow-auto p-12">
                <form className="flex flex-col gap-3 justify-between h-full w-full" onSubmit={handleSave}>
                    <div className="flex flex-col gap-4 flex-grow-0 w-full">
                        <div className="flex justify-between items-center">
                            <DialogTitle>User Profile</DialogTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() => setEditMode(!editMode)}
                                aria-label={editMode ? "Cancel edit" : "Edit profile"}
                            >
                                {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                            </Button>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex flex-col">
                                <Avatar className="h-32 w-32">
                                    <AvatarImage src={image || undefined} alt={individual?.full_name} />
                                    <AvatarFallback>{individual?.full_name?.[0] || "?"}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="flex-grow w-full">
                                <Tabs defaultValue="overview" className="w-full">
                                    <TabsList className="overflow-hidden w-full justify-start">
                                        <TabsTrigger value="overview">Overview</TabsTrigger>
                                        <TabsTrigger value="social_account">
                                            Social accounts
                                            {isLoadingRelations ? (
                                                <span className="ml-1">Loading...</span>
                                            ) : (
                                                <Badge variant={accounts?.length > 0 ? "default" : "outline"} className="ml-1">
                                                    {accounts?.length}
                                                </Badge>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="emails">
                                            Emails
                                            {isLoadingEmails ? (
                                                <span className="ml-1">Loading...</span>
                                            ) : (
                                                <Badge variant={emails?.length > 0 ? "default" : "outline"} className="ml-1">
                                                    {emails?.length}
                                                </Badge>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="phone_numbers">
                                            Phone numbers
                                            {isLoadingRelations ? (
                                                <span className="ml-1">Loading...</span>
                                            ) : (
                                                <Badge variant={phones?.length > 0 ? "default" : "outline"} className="ml-1">
                                                    {phones?.length}
                                                </Badge>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="ip_addresses">
                                            IP addresses
                                            {isLoadingRelations ? (
                                                <span className="ml-1">Loading...</span>
                                            ) : (
                                                <Badge variant={ips?.length > 0 ? "default" : "outline"} className="ml-1">
                                                    {ips?.length}
                                                </Badge>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="relations">
                                            Relations
                                            {isLoadingRelations ? (
                                                <span className="ml-1">Loading...</span>
                                            ) : (
                                                <Badge variant={relations?.length > 0 ? "default" : "outline"} className="ml-1">
                                                    {relations?.length}
                                                </Badge>
                                            )}
                                        </TabsTrigger>
                                    </TabsList>
                                    <div className="pt-3">
                                        <TabsContent value="overview">
                                            <div className="flex flex-col gap-3">
                                                {individual &&
                                                    Object.keys(individual)
                                                        .filter((key) => typeof individual[key] !== "object" || !Array.isArray(individual[key]))
                                                        .map((key) => (
                                                            <div key={key} className="flex flex-col gap-1">
                                                                <label className="capitalize-first">{key}</label>
                                                                <Input
                                                                    type={key === "birth_date" ? "date" : "text"}
                                                                    defaultValue={individual[key]}
                                                                    placeholder={key}
                                                                    name={key}
                                                                    disabled={key === "id" || key === "investigation_id" || !editMode}
                                                                />
                                                            </div>
                                                        ))}
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="emails">
                                            <div className="flex flex-col gap-3">
                                                {emails.length === 0 && (
                                                    <p className="italic text-muted-foreground text-sm">
                                                        No email registered. Click on edit to add one.
                                                    </p>
                                                )}
                                                {emails.map((email: any, index: number) => (
                                                    <div key={index} className="flex flex-col">
                                                        <Alert variant={email.breaches.length > 0 ? "destructive" : "default"}>
                                                            <AlertDescription>
                                                                <span className="font-bold">{email.email}</span>{" "}
                                                                {email.breaches.length === 0
                                                                    ? " is not yet involved in a data breach."
                                                                    : ` was involved in ${email.breaches.length} data breach(es).`}
                                                            </AlertDescription>
                                                        </Alert>
                                                        <Breaches breaches={email.breaches} />
                                                    </div>
                                                ))}
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="social_account">
                                            <div className="grid grid-cols-3 gap-3">
                                                {accounts.length === 0 && (
                                                    <p className="italic text-muted-foreground text-sm">
                                                        No account registered. Click on edit to add one.
                                                    </p>
                                                )}
                                                {accounts.map((account: any, index) => (
                                                    <Card key={index} className="p-3 cursor-pointer">
                                                        <CardContent className="flex items-center gap-3 p-0">
                                                            <Avatar className="h-8 w-8">
                                                                {/* @ts-ignore */}
                                                                <AvatarImage src={platformsIcons[account?.platform]?.icon} />
                                                                <AvatarFallback>{account?.platform?.[0] || "?"}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="overflow-hidden">
                                                                <p className="text-sm font-semibold">{account?.platform}</p>
                                                                <p className="text-sm font-bold">
                                                                    {account?.username || <span className="italic font-light">No username</span>}
                                                                </p>
                                                                <a
                                                                    href={account?.profile_url}
                                                                    className="text-sm text-blue-600 hover:underline truncate block"
                                                                >
                                                                    {account?.profile_url}
                                                                </a>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                                {editMode && (
                                                    <Button onClick={() => handleAddField(setAccounts)} variant="outline">
                                                        <Plus className="mr-2 h-4 w-4" /> Add account
                                                    </Button>
                                                )}
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="phone_numbers">
                                            <div className="flex flex-col gap-3 max-w-md">
                                                {phones.length === 0 && (
                                                    <p className="italic text-muted-foreground text-sm">
                                                        No phone number registered. Click on edit to add one.
                                                    </p>
                                                )}
                                                {phones.map((phone, index) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <Input
                                                            value={phone}
                                                            onChange={(e) => handleFieldChange(index, e.target.value, setPhones)}
                                                            placeholder="Phone Number"
                                                            type="tel"
                                                            disabled={!editMode}
                                                            className="flex-grow"
                                                        />
                                                        {editMode && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveField(index, setPhones)}
                                                                aria-label="Remove phone"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                                {editMode && (
                                                    <Button onClick={() => handleAddField(setPhones)} variant="outline">
                                                        <Plus className="mr-2 h-4 w-4" /> Add Phone
                                                    </Button>
                                                )}
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="ip_addresses">
                                            <div className="flex flex-col gap-3">
                                                {ips.length === 0 && (
                                                    <p className="italic text-muted-foreground text-sm">
                                                        No IP address registered. Click on edit to add one.
                                                    </p>
                                                )}
                                                {ips.map((ip, index) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <Input
                                                            value={ip}
                                                            onChange={(e) => handleFieldChange(index, e.target.value, setIps)}
                                                            placeholder="IP address"
                                                            type="text"
                                                            disabled={!editMode}
                                                            className="flex-grow"
                                                        />
                                                        {editMode &&
                                                            (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleRemoveField(index, setIps)}
                                                                    aria-label="Remove IP"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                    </div>
                                                ))}
                                                {editMode && (
                                                    <Button onClick={() => handleAddField(setIps)} variant="outline">
                                                        <Plus className="mr-2 h-4 w-4" /> Add IP address
                                                    </Button>
                                                )}
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="relations">
                                            <div className="grid grid-cols-3 gap-3">
                                                {relations.length === 0 && (
                                                    <p className="italic text-muted-foreground text-sm">
                                                        No relation registered. Click on edit to add one.
                                                    </p>
                                                )}
                                                {relations.map((relation) => (
                                                    <Card
                                                        key={relation.id}
                                                        className="p-3 cursor-pointer"
                                                        onClick={() => setIndividualId(relation.id)}
                                                    >
                                                        <CardContent className="flex items-center gap-3 p-0">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={relation?.image_url} alt={relation.full_name} />
                                                                <AvatarFallback>{relation.full_name?.[0] || "?"}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="text-sm font-semibold">{relation.full_name}</p>
                                                                <p className="text-sm text-muted-foreground">{relation.relation_type}</p>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        {editMode && <Button type="submit">Save Changes</Button>}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default IndividualModal