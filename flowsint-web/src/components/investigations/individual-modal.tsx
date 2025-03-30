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
import { Pencil, X, Plus, Trash2, Building2, Mail, MapPin, Phone, Briefcase, ExternalLink } from "lucide-react"
import Breaches from "../breach"
import { useQueryState } from "nuqs"
import { Progress } from "@/components/ui/progress"

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
        setPhones(individual?.phone_numbers?.map(({ phone_number }: any) => phone_number) || [""])
        setIps(individual?.ip_addresses?.map(({ ip_address }: any) => ip_address) || [""])
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
            <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 bg-black text-white border-zinc-800 overflow-hidden">
                <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                        <DialogTitle className="text-xl font-bold">{individual?.full_name || "User Profile"}</DialogTitle>
                        <div className="flex items-center gap-2 mr-12">
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setEditMode(!editMode)}
                                aria-label={editMode ? "Cancel edit" : "Edit profile"}
                                className="text-zinc-400 flex hover:text-white hover:bg-zinc-800"
                            >
                                {editMode ? <>Close <X className="h-4 w-4" /></> : <>Edit <Pencil className="h-4 w-4" /></>}
                            </Button>
                            {/* <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCloseModal}
                                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                                <X className="h-4 w-4" />
                            </Button> */}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <form className="flex flex-col gap-6" onSubmit={handleSave}>
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Left column - Profile image and basic info */}
                                <div className="flex flex-col gap-4 md:w-1/3">
                                    <div className="flex flex-col items-center gap-4 bg-zinc-900 rounded-xl p-6">
                                        <Avatar className="h-32 w-32 border-2 border-zinc-700">
                                            <AvatarImage src={image || undefined} alt={individual?.full_name} />
                                            <AvatarFallback className="bg-zinc-800 text-zinc-300 text-2xl">
                                                {individual?.full_name?.[0] || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-center">
                                            <h2 className="text-xl font-bold">{individual?.full_name}</h2>
                                            {individual?.job_title && <p className="text-zinc-400">{individual.job_title}</p>}
                                        </div>

                                        <div className="w-full space-y-4 mt-2">
                                            {individual?.email && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Mail className="h-4 w-4 text-zinc-500" />
                                                    <span className="text-zinc-300">{individual.email}</span>
                                                </div>
                                            )}

                                            {phones[0] && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Phone className="h-4 w-4 text-zinc-500" />
                                                    <span className="text-zinc-300">{phones[0]}</span>
                                                </div>
                                            )}

                                            {individual?.location && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <MapPin className="h-4 w-4 text-zinc-500" />
                                                    <span className="text-zinc-300">{individual.location}</span>
                                                </div>
                                            )}

                                            {individual?.company && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Building2 className="h-4 w-4 text-zinc-500" />
                                                    <span className="text-zinc-300">{individual.company}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold mb-4">Profile</h3>
                                        <div className="space-y-3">
                                            {individual?.birth_date && (
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-400">Birthday</span>
                                                    <span>{individual.birth_date}</span>
                                                </div>
                                            )}

                                            {individual?.family_status && (
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-400">Family status</span>
                                                    <span>{individual.family_status}</span>
                                                </div>
                                            )}

                                            {individual?.education && (
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-400">Education</span>
                                                    <span>{individual.education}</span>
                                                </div>
                                            )}

                                            {individual?.job_title && (
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-400">Job title</span>
                                                    <span>{individual.job_title}</span>
                                                </div>
                                            )}

                                            {individual?.company && (
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-400">Company</span>
                                                    <span>{individual.company}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Score card */}
                                    <div className="bg-zinc-900 rounded-xl p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold">Overall score</h3>
                                            <div className="relative h-16 w-16">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-xl font-bold">60</span>
                                                </div>
                                                <svg className="h-full w-full" viewBox="0 0 36 36">
                                                    <path
                                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                        fill="none"
                                                        stroke="#444"
                                                        strokeWidth="2"
                                                    />
                                                    <path
                                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                        fill="none"
                                                        stroke="url(#gradient)"
                                                        strokeWidth="2"
                                                        strokeDasharray="60, 100"
                                                    />
                                                    <defs>
                                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                            <stop offset="0%" stopColor="#4ade80" />
                                                            <stop offset="100%" stopColor="#facc15" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-zinc-400">Phone score</span>
                                                    <span>60</span>
                                                </div>
                                                <Progress value={60} className="h-1.5 bg-zinc-800" />
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-zinc-400">Email score</span>
                                                    <span>10</span>
                                                </div>
                                                <Progress value={10} className="h-1.5 bg-zinc-800" />
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-zinc-400">IP address score</span>
                                                    <span>—</span>
                                                </div>
                                                <Progress value={0} className="h-1.5 bg-zinc-800" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right column - Tabs content */}
                                <div className="flex-1">
                                    <Tabs defaultValue="overview" className="w-full">
                                        <TabsList className="w-full justify-start bg-zinc-900 p-1 rounded-lg mb-4">
                                            <TabsTrigger
                                                value="overview"
                                                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                                            >
                                                Overview
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="social_account"
                                                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                                            >
                                                Social accounts
                                                <Badge variant={accounts?.length > 0 ? "default" : "outline"} className="ml-1 bg-zinc-700">
                                                    {accounts?.length || 0}
                                                </Badge>
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="emails"
                                                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                                            >
                                                Emails
                                                <Badge variant={emails?.length > 0 ? "default" : "outline"} className="ml-1 bg-zinc-700">
                                                    {emails?.length || 0}
                                                </Badge>
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="phone_numbers"
                                                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                                            >
                                                Phone numbers
                                                <Badge variant={phones?.length > 0 ? "default" : "outline"} className="ml-1 bg-zinc-700">
                                                    {phones?.length || 0}
                                                </Badge>
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="ip_addresses"
                                                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                                            >
                                                IP addresses
                                                <Badge variant={ips?.length > 0 ? "default" : "outline"} className="ml-1 bg-zinc-700">
                                                    {ips?.length || 0}
                                                </Badge>
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="relations"
                                                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                                            >
                                                Relations
                                                <Badge variant={relations?.length > 0 ? "default" : "outline"} className="ml-1 bg-zinc-700">
                                                    {relations?.length || 0}
                                                </Badge>
                                            </TabsTrigger>
                                        </TabsList>

                                        <div className="bg-zinc-900 rounded-xl p-6">
                                            <TabsContent value="overview">
                                                {editMode ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {individual &&
                                                            Object.keys(individual)
                                                                .filter((key) => typeof individual[key] !== "object" || !Array.isArray(individual[key]))
                                                                .map((key) => (
                                                                    <div key={key} className="flex flex-col gap-1">
                                                                        <label className="text-zinc-400 capitalize-first">{key}</label>
                                                                        <Input
                                                                            type={key === "birth_date" ? "date" : "text"}
                                                                            defaultValue={individual[key]}
                                                                            placeholder={key}
                                                                            name={key}
                                                                            disabled={key === "id" || key === "investigation_id" || !editMode}
                                                                            className="bg-zinc-800 border-zinc-700 text-white"
                                                                        />
                                                                    </div>
                                                                ))}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        {/* Job History */}
                                                        <div>
                                                            <h3 className="text-lg font-semibold mb-4">Job History</h3>
                                                            <div className="space-y-4">
                                                                <div className="flex gap-4 items-start">
                                                                    <div className="bg-blue-500/20 p-2 rounded-md">
                                                                        <Briefcase className="h-5 w-5 text-blue-500" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between">
                                                                            <div>
                                                                                <h4 className="font-medium">Data Analyst</h4>
                                                                                <p className="text-zinc-400 text-sm">Vertex Dynamics</p>
                                                                            </div>
                                                                            <span className="text-zinc-400 text-sm">Nov 2023 - Mar 2024</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-4 items-start">
                                                                    <div className="bg-yellow-500/20 p-2 rounded-md">
                                                                        <Briefcase className="h-5 w-5 text-yellow-500" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between">
                                                                            <div>
                                                                                <h4 className="font-medium">Senior Software Engineer</h4>
                                                                                <p className="text-zinc-400 text-sm">Innovatech Solutions</p>
                                                                            </div>
                                                                            <span className="text-zinc-400 text-sm">Jul 2022 - Nov 2023</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-4 items-start">
                                                                    <div className="bg-green-500/20 p-2 rounded-md">
                                                                        <Briefcase className="h-5 w-5 text-green-500" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between">
                                                                            <div>
                                                                                <h4 className="font-medium">Software Engineer</h4>
                                                                                <p className="text-zinc-400 text-sm">Quantum Systems</p>
                                                                            </div>
                                                                            <span className="text-zinc-400 text-sm">Feb 2021 - Dec 2022</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="social_account">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {accounts.length === 0 && (
                                                        <p className="italic text-zinc-400 text-sm col-span-full">
                                                            No account registered. Click on edit to add one.
                                                        </p>
                                                    )}

                                                    {accounts.map((account: any, index) => (
                                                        <Card key={index} className="bg-zinc-800 border-zinc-700 p-4">
                                                            <CardContent className="flex items-center gap-3 p-0">
                                                                <Avatar className="h-10 w-10 bg-zinc-700">
                                                                    {/* @ts-ignore */}
                                                                    <AvatarImage src={platformsIcons[account?.platform]?.icon} />
                                                                    <AvatarFallback className="bg-zinc-700 text-zinc-300">
                                                                        {account?.platform?.[0] || "?"}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="overflow-hidden">
                                                                    <p className="text-sm font-semibold">{account?.platform}</p>
                                                                    <p className="text-sm font-bold">
                                                                        {account?.username || <span className="italic font-light">No username</span>}
                                                                    </p>
                                                                    <a
                                                                        href={account?.profile_url}
                                                                        className="text-sm text-blue-400 hover:underline truncate block flex items-center gap-1"
                                                                    >
                                                                        {account?.profile_url}
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </a>
                                                                </div>

                                                                {editMode && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleRemoveField(index, setAccounts)}
                                                                        className="ml-auto text-zinc-400 hover:text-white hover:bg-zinc-700"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    ))}

                                                    {editMode && (
                                                        <Button
                                                            onClick={() => handleAddField(setAccounts)}
                                                            variant="outline"
                                                            className="border-dashed border-zinc-700 hover:border-zinc-500 bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800"
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" /> Add account
                                                        </Button>
                                                    )}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="emails">
                                                <div className="space-y-4">
                                                    {emails.length === 0 && (
                                                        <p className="italic text-zinc-400 text-sm">
                                                            No email registered. Click on edit to add one.
                                                        </p>
                                                    )}

                                                    {emails.map((email: any, index: number) => (
                                                        <div key={index} className="space-y-2">
                                                            <Alert
                                                                variant={email.breaches.length > 0 ? "destructive" : "default"}
                                                                className={
                                                                    email.breaches.length > 0
                                                                        ? "bg-red-950/50 border-red-900 text-red-200"
                                                                        : "bg-zinc-800 border-zinc-700"
                                                                }
                                                            >
                                                                <AlertDescription className="flex items-center gap-2">
                                                                    <Mail className="h-4 w-4" />
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

                                            <TabsContent value="phone_numbers">
                                                <div className="space-y-4">
                                                    {phones.length === 0 && (
                                                        <p className="italic text-zinc-400 text-sm">
                                                            No phone number registered. Click on edit to add one.
                                                        </p>
                                                    )}

                                                    {phones.map((phone, index) => (
                                                        <div key={index} className="flex items-center gap-2">
                                                            <div className="bg-zinc-800 border border-zinc-700 rounded-md p-3 flex items-center gap-3 flex-1">
                                                                <Phone className="h-4 w-4 text-zinc-400" />
                                                                {editMode ? (
                                                                    <Input
                                                                        value={phone}
                                                                        onChange={(e) => handleFieldChange(index, e.target.value, setPhones)}
                                                                        placeholder="Phone Number"
                                                                        type="tel"
                                                                        className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                                                                    />
                                                                ) : (
                                                                    <span>{phone}</span>
                                                                )}
                                                            </div>

                                                            {editMode && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleRemoveField(index, setPhones)}
                                                                    className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {editMode && (
                                                        <Button
                                                            onClick={() => handleAddField(setPhones)}
                                                            variant="outline"
                                                            className="border-dashed border-zinc-700 hover:border-zinc-500 bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800"
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" /> Add Phone
                                                        </Button>
                                                    )}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="ip_addresses">
                                                <div className="space-y-4">
                                                    {ips.length === 0 && (
                                                        <p className="italic text-zinc-400 text-sm">
                                                            No IP address registered. Click on edit to add one.
                                                        </p>
                                                    )}

                                                    {ips.map((ip, index) => (
                                                        <div key={index} className="flex items-center gap-2">
                                                            <div className="bg-zinc-800 border border-zinc-700 rounded-md p-3 flex items-center gap-3 flex-1">
                                                                <svg
                                                                    className="h-4 w-4 text-zinc-400"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                >
                                                                    <path
                                                                        d="M12 2L2 7L12 12L22 7L12 2Z"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    />
                                                                    <path
                                                                        d="M2 17L12 22L22 17"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    />
                                                                    <path
                                                                        d="M2 12L12 17L22 12"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    />
                                                                </svg>
                                                                {editMode ? (
                                                                    <Input
                                                                        value={ip}
                                                                        onChange={(e) => handleFieldChange(index, e.target.value, setIps)}
                                                                        placeholder="IP address"
                                                                        type="text"
                                                                        className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                                                                    />
                                                                ) : (
                                                                    <span>{ip}</span>
                                                                )}
                                                            </div>

                                                            {editMode && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleRemoveField(index, setIps)}
                                                                    className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {editMode && (
                                                        <Button
                                                            onClick={() => handleAddField(setIps)}
                                                            variant="outline"
                                                            className="border-dashed border-zinc-700 hover:border-zinc-500 bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800"
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" /> Add IP address
                                                        </Button>
                                                    )}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="relations">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {relations.length === 0 && (
                                                        <p className="italic text-zinc-400 text-sm col-span-full">
                                                            No relation registered. Click on edit to add one.
                                                        </p>
                                                    )}

                                                    {relations.map((relation) => (
                                                        <Card
                                                            key={relation.id}
                                                            className="bg-zinc-800 border-zinc-700 p-4 hover:bg-zinc-750 transition-colors cursor-pointer"
                                                            onClick={() => setIndividualId(relation.id)}
                                                        >
                                                            <CardContent className="flex items-center gap-3 p-0">
                                                                <Avatar className="h-10 w-10 border border-zinc-700">
                                                                    <AvatarImage src={relation?.image_url} alt={relation.full_name} />
                                                                    <AvatarFallback className="bg-zinc-700 text-zinc-300">
                                                                        {relation.full_name?.[0] || "?"}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-semibold">{relation.full_name}</p>
                                                                    <p className="text-sm text-zinc-400">{relation.relation_type}</p>
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
                            {editMode && (
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setEditMode(false)}
                                        className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                                        Save Changes
                                    </Button>
                                </DialogFooter>
                            )}
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default IndividualModal
