"use client"
import type React from "react"
import { useEffect, useState } from "react"
import {
    Flex,
    Dialog,
    TextField,
    Button,
    Box,
    Skeleton,
    Card,
    Inset,
    Separator,
    Avatar,
    Tabs,
    IconButton,
    Text,
    Spinner,
    Badge,
    Grid,
    Link,
} from "@radix-ui/themes"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useIndividual } from "@/src/lib/hooks/individuals/use-individual"
import { Pencil1Icon, Cross2Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons"
import { useRelations } from "@/src/lib/hooks/individuals/use-relations"
import { useInvestigationContext } from "../contexts/investigation-provider"
import { usePlatformIcons } from "@/src/lib/hooks/use-platform-icons"

const IndividualModal = () => {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const individual_id = searchParams.get("individual_id")
    const { handleOpenIndividualModal } = useInvestigationContext()
    const { individual, isLoading } = useIndividual(individual_id)
    const platformsIcons = usePlatformIcons("medium")
    const { relations, isLoading: isLoadingRelations } = useRelations(individual_id)
    const [editMode, setEditMode] = useState(false)
    const [emails, setEmails] = useState([""])
    const [phones, setPhones] = useState([""])
    const [accounts, setAccounts] = useState([""])
    const [ips, setIps] = useState([""])

    useEffect(() => {
        setEmails(individual?.emails.map(({ email }: any) => email) || [""])
        setPhones(individual?.phone_numbers.map(({ phone_number }: any) => phone_number) || [""])
        setIps(individual?.ip_addresses.map(({ ip_address }: any) => ip_address) || [""])
        setAccounts(individual?.social_accounts || [""])
    }, [individual])

    const handleCloseModal = () => {
        setEditMode(false)
        router.push(pathname)
    }

    const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const formContent = Object.fromEntries(formData.entries())
        formContent.emails = emails as any
        formContent.phones = phones as any
        formContent.ip_addresses = ips as any
        formContent.accounts = accounts as any
        alert(JSON.stringify(formContent, null, 2))
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
            <Dialog.Root open={Boolean(individual_id)} onOpenChange={handleCloseModal}>
                <Dialog.Content>
                    <Dialog.Title>No data</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        No data found for this individual.
                    </Dialog.Description>
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            Close
                        </Button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Root>
        )
    }

    return (
        <Dialog.Root open={Boolean(individual_id)} onOpenChange={handleCloseModal}>
            <Dialog.Content style={{ maxWidth: "1200px", width: "90vw" }} minHeight={"80vh"}>
                <Skeleton loading={isLoading}>
                    <form className="flex flex-col gap-3 justify-between h-full" onSubmit={handleSave}>
                        <Flex direction="column" gap="4" flexGrow="0">
                            <Flex justify="between" align="center">
                                <Dialog.Title>User Profile</Dialog.Title>
                                <IconButton
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEditMode(!editMode)}
                                    aria-label={editMode ? "Cancel edit" : "Edit profile"}
                                >
                                    {editMode ? <Cross2Icon /> : <Pencil1Icon />}
                                </IconButton>
                            </Flex>
                            <Flex gap="6">
                                <Flex direction={"column"}>
                                    <Avatar
                                        size="9"
                                        src={individual?.image_url}
                                        fallback={individual?.full_name?.[0] || "?"}
                                        radius="full"
                                    />
                                    {editMode && (
                                        <Button type="button" size="1" variant="soft" style={{ marginTop: "8px" }}>
                                            Change Photo
                                        </Button>
                                    )}
                                </Flex>
                                <Box style={{ flexGrow: 1 }}>
                                    <Tabs.Root defaultValue="overview">
                                        <Tabs.List className="!overflow-x-auto">
                                            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
                                            <Tabs.Trigger value="social_account">Social accounts<Spinner className="ml-1" loading={isLoadingRelations}><Badge color={accounts?.length > 0 ? "indigo" : "gray"} radius="full" className="ml-1">{accounts?.length}</Badge></Spinner></Tabs.Trigger>
                                            <Tabs.Trigger value="emails">Emails<Spinner className="ml-1" loading={isLoadingRelations}><Badge color={emails?.length > 0 ? "indigo" : "gray"} radius="full" className="ml-1">{emails?.length}</Badge></Spinner></Tabs.Trigger>
                                            <Tabs.Trigger value="phone_numbers">Phone numbers<Spinner className="ml-1" loading={isLoadingRelations}><Badge color={phones?.length > 0 ? "indigo" : "gray"} radius="full" className="ml-1">{phones?.length}</Badge></Spinner></Tabs.Trigger>
                                            <Tabs.Trigger value="ip_addresses">IP addresses<Spinner className="ml-1" loading={isLoadingRelations}><Badge color={ips?.length > 0 ? "indigo" : "gray"} radius="full" className="ml-1">{ips?.length}</Badge></Spinner></Tabs.Trigger>
                                            <Tabs.Trigger value="relations">Relations<Spinner className="ml-1" loading={isLoadingRelations}><Badge color={relations?.length > 0 ? "indigo" : "gray"} radius="full" className="ml-1">{relations?.length}</Badge></Spinner></Tabs.Trigger>
                                        </Tabs.List>
                                        <Box pt="3">
                                            <Tabs.Content value="overview">
                                                <Flex direction="column" gap="3">
                                                    {individual && Object.keys(individual).filter((key) => typeof individual[key] !== "object" || !Array.isArray(individual[key])).map((key) => (
                                                        <Flex key={key} direction="column" gap="1">
                                                            <label className="capitalize-first">{key}</label>
                                                            <TextField.Root
                                                                defaultValue={individual[key]}
                                                                placeholder={key}
                                                                name={key}
                                                                disabled={!editMode}
                                                            />
                                                        </Flex>
                                                    ))}
                                                </Flex>
                                            </Tabs.Content>
                                            <Tabs.Content value="emails">
                                                <Flex direction="column" gap="3" maxWidth={"420px"}>
                                                    {emails.length === 0 && <Text className="italic opacity-60 text-sm">No email registered. Click on edit to add one.</Text>}
                                                    {emails.map((email: string | number | undefined, index: React.Key | null | undefined) => (
                                                        <Flex key={index} gap="2" align="center">
                                                            <TextField.Root
                                                                value={email}
                                                                onChange={(e) => handleFieldChange(index as any, e.target.value, setEmails)}
                                                                placeholder="Email"
                                                                type="email"
                                                                disabled={!editMode}
                                                                style={{ flexGrow: 1 }}
                                                            />
                                                            {editMode && (
                                                                <IconButton
                                                                    type="button"
                                                                    variant="ghost"
                                                                    onClick={() => handleRemoveField(index as any, setEmails)}
                                                                    aria-label="Remove email"
                                                                >
                                                                    <TrashIcon />
                                                                </IconButton>
                                                            )}
                                                        </Flex>
                                                    ))}
                                                    {editMode && (
                                                        <Button type="button" onClick={() => handleAddField(setEmails)} variant="soft">
                                                            <PlusIcon /> Add Email
                                                        </Button>
                                                    )}
                                                </Flex>
                                            </Tabs.Content>
                                            <Tabs.Content value="social_account">
                                                <Grid columns="3" gap="3" width="auto">
                                                    {accounts.length === 0 && <Text className="italic opacity-60 text-sm">No account registered. Click on edit to add one.</Text>}
                                                    {accounts.map((account: any, index) => (
                                                        <Badge className="!p-3 cursor-pointer" color="gray" radius="large" key={index} asChild size="1">
                                                            <Flex gap="3" align="center" direction={"row"} className="w-full">
                                                                {/* @ts-ignore */}
                                                                <Avatar size="3" radius="full" color={platformsIcons[account?.platform]?.color || "amber"} fallback={platformsIcons[account?.platform]?.icon || "?"} />
                                                                <Box width={"80%"}>
                                                                    <Text as="div" size="1" weight="bold">
                                                                        {account?.platform}
                                                                    </Text>
                                                                    <Text as="div" size="2" weight="bold">
                                                                        {account?.username || <span className="italic font-light">No username</span>}
                                                                    </Text>
                                                                    <Link href={account?.profile_url} size="2" className="!max-w-full" color="indigo">
                                                                        <Text as="div" truncate>
                                                                            {account?.profile_url}
                                                                        </Text>
                                                                    </Link>
                                                                </Box>
                                                            </Flex>
                                                        </Badge>
                                                    ))}
                                                    {editMode && (
                                                        <Button type="button" onClick={() => handleAddField(setAccounts)} variant="soft">
                                                            <PlusIcon /> Add account
                                                        </Button>
                                                    )}
                                                </Grid>
                                            </Tabs.Content>
                                            <Tabs.Content value="phone_numbers">
                                                <Flex direction="column" gap="3" maxWidth={"420px"}>
                                                    {phones.length === 0 && <Text className="italic opacity-60 text-sm">No phone number registered. Click on edit to add one.</Text>}
                                                    {phones.map((phone, index) => (
                                                        <Flex key={index} gap="2" align="center">
                                                            <TextField.Root
                                                                value={phone}
                                                                onChange={(e) => handleFieldChange(index, e.target.value, setPhones)}
                                                                placeholder="Phone Number"
                                                                type="tel"
                                                                disabled={!editMode}
                                                                style={{ flexGrow: 1 }}
                                                            />
                                                            {editMode && (
                                                                <IconButton
                                                                    type="button"
                                                                    variant="ghost"
                                                                    onClick={() => handleRemoveField(index, setPhones)}
                                                                    aria-label="Remove phone"
                                                                >
                                                                    <TrashIcon />
                                                                </IconButton>
                                                            )}
                                                        </Flex>
                                                    ))}
                                                    {editMode && (
                                                        <Button type="button" onClick={() => handleAddField(setPhones)} variant="soft">
                                                            <PlusIcon /> Add Phone
                                                        </Button>
                                                    )}
                                                </Flex>
                                            </Tabs.Content>
                                            <Tabs.Content value="ip_addresses">
                                                <Flex direction="column" gap="3">
                                                    {ips.length === 0 && <Text className="italic opacity-60 text-sm">No IP address registered. Click on edit to add one.</Text>}
                                                    {ips.map((ip, index) => (
                                                        <Flex key={index} gap="2" align="center">
                                                            <TextField.Root
                                                                value={ip}
                                                                onChange={(e) => handleFieldChange(index, e.target.value, setIps)}
                                                                placeholder="IP address"
                                                                type="text"
                                                                disabled={!editMode}
                                                                style={{ flexGrow: 1 }}
                                                            />
                                                            {editMode && (
                                                                <IconButton
                                                                    type="button"
                                                                    variant="ghost"
                                                                    onClick={() => handleRemoveField(index, setIps)}
                                                                    aria-label="Remove ip"
                                                                >
                                                                    <TrashIcon />
                                                                </IconButton>
                                                            )}
                                                        </Flex>
                                                    ))}
                                                    {editMode && (
                                                        <Button type="button" onClick={() => handleAddField(setIps)} variant="soft">
                                                            <PlusIcon /> Add IP address
                                                        </Button>
                                                    )}
                                                </Flex>
                                            </Tabs.Content>
                                            <Tabs.Content value="relations">
                                                <Grid columns="3" gap="3" width="auto">
                                                    {relations.length === 0 && <Text className="italic opacity-60 text-sm">No relation registered. Click on edit to add one.</Text>}
                                                    {relations.map((relation) => (
                                                        <Badge className="!p-3 cursor-pointer" color="gray" radius="large" key={relation.id} onClick={() => handleOpenIndividualModal(relation.id)} asChild size="1">
                                                            <Flex gap="3" align="center" direction={"row"} className="w-full">
                                                                <Avatar src={relation?.image_url} size="3" radius="full" fallback={relation.full_name[0]} color="indigo" />
                                                                <Box>
                                                                    <Text as="div" size="2" weight="bold">
                                                                        {relation.full_name}
                                                                    </Text>
                                                                    <Text as="div" size="2" color="gray">
                                                                        {relation.relation_type}
                                                                    </Text>
                                                                </Box>
                                                            </Flex>
                                                        </Badge>
                                                    ))}
                                                </Grid>
                                            </Tabs.Content>
                                        </Box>
                                    </Tabs.Root>
                                </Box>
                            </Flex>
                        </Flex>
                        <Flex gap="3" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">
                                    Cancel
                                </Button>
                            </Dialog.Close>
                            {editMode && <Button type="submit">Save Changes</Button>}
                        </Flex>
                    </form>
                </Skeleton>
            </Dialog.Content>
        </Dialog.Root>
    )
}

export default IndividualModal

