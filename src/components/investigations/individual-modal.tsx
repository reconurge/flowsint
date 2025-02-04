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
} from "@radix-ui/themes"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useIndividual } from "@/src/lib/hooks/use-individual"
import { Pencil1Icon, Cross2Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons"
import social from "./nodes/social"

const IndividualModal = () => {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const individual_id = searchParams.get("individual_id")
    const { individual, isLoading } = useIndividual(individual_id)
    const [editMode, setEditMode] = useState(false)
    const [emails, setEmails] = useState([""])
    const [phones, setPhones] = useState([""])
    const [accounts, setAccounts] = useState([""])
    const [ipAddresses, setIpAddresses] = useState([""])

    console.log(individual)
    useEffect(() => {
        setEmails(individual?.emails.map(({ email }: any) => email) || [""])
        setPhones(individual?.phone_numbers.map(({ phone_number }: any) => phone_number) || [""])
        setIpAddresses(individual?.ip_addresses.map(({ ip_address }: any) => ip_address) || [""])
        setAccounts(individual?.social_accounts.map(({ username }: any) => username) || [""])
    }, [individual])

    const handleCloseModal = () => {
        router.push(pathname)
    }

    const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const formContent = Object.fromEntries(formData.entries())
        formContent.emails = emails as any
        formContent.phones = phones as any
        formContent.ip_addresses = ipAddresses as any
        alert(JSON.stringify(formContent, null, 2))
        setEditMode(false)
    }

    const handleAddField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
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
            <Dialog.Content style={{ maxWidth: "900px", width: "90vw" }} minHeight={"80vh"}>
                <Skeleton loading={isLoading}>
                    <form className="flex flex-col gap-3 justify-between h-full" onSubmit={handleSave}>
                        <Flex direction="column" gap="4">
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
                                        <Tabs.List>
                                            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
                                            <Tabs.Trigger value="social_account">Social accounts</Tabs.Trigger>
                                            <Tabs.Trigger value="emails">Emails</Tabs.Trigger>
                                            <Tabs.Trigger value="phone_numbers">Phone numbers</Tabs.Trigger>
                                            <Tabs.Trigger value="ip_addresses">IP addresses</Tabs.Trigger>
                                        </Tabs.List>
                                        <Box pt="3">
                                            <Tabs.Content value="overview">
                                                <Flex direction="column" gap="3">
                                                    <TextField.Root
                                                        defaultValue={individual?.full_name}
                                                        placeholder="Full Name"
                                                        name="full_name"
                                                        disabled={!editMode}
                                                    />
                                                    {emails.map((email: string | number | undefined, index: React.Key | null | undefined) => (
                                                        <Flex key={index} gap="2" align="center">
                                                            <TextField.Root
                                                                value={email}
                                                                onChange={(e) => handleFieldChange(index, e.target.value, setEmails)}
                                                                placeholder="Email"
                                                                type="email"
                                                                disabled={!editMode}
                                                                style={{ flexGrow: 1 }}
                                                            />
                                                            {editMode && (
                                                                <IconButton
                                                                    type="button"
                                                                    variant="ghost"
                                                                    onClick={() => handleRemoveField(index, setEmails)}
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

                                            <Tabs.Content value="social_account">
                                                <Flex direction="column" gap="3">
                                                    <TextField.Root
                                                        defaultValue={individual?.username}
                                                        placeholder="Username"
                                                        name="username"
                                                        disabled={!editMode}
                                                    />
                                                    {editMode && (
                                                        <TextField.Root placeholder="New Password" name="new_password" type="password" />
                                                    )}
                                                    {accounts.map((account, index) => (
                                                        <Flex key={index} gap="2" align="center">
                                                            <TextField.Root
                                                                value={account}
                                                                onChange={(e) => handleFieldChange(index, e.target.value, setAccounts)}
                                                                placeholder="Social account"
                                                                disabled={!editMode}
                                                                style={{ flexGrow: 1 }}
                                                            />
                                                            {editMode && (
                                                                <IconButton
                                                                    variant="ghost"
                                                                    onClick={() => handleRemoveField(index, setAccounts)}
                                                                    aria-label="Remove social account"
                                                                >
                                                                    <TrashIcon />
                                                                </IconButton>
                                                            )}
                                                        </Flex>
                                                    ))}
                                                    {editMode && (
                                                        <Button type="button" onClick={() => handleAddField(setIpAddresses)} variant="soft">
                                                            <PlusIcon /> Add IP Address
                                                        </Button>
                                                    )}
                                                </Flex>
                                            </Tabs.Content>

                                            <Tabs.Content value="emails">
                                                <Flex direction="column" gap="3">
                                                    <TextField.Root
                                                        defaultValue={individual?.language}
                                                        placeholder="Preferred Language"
                                                        name="language"
                                                        disabled={!editMode}
                                                    />
                                                    <TextField.Root
                                                        defaultValue={individual?.timezone}
                                                        placeholder="Timezone"
                                                        name="timezone"
                                                        disabled={!editMode}
                                                    />
                                                </Flex>
                                            </Tabs.Content>
                                            <Tabs.Content value="phone_numbers">
                                                <Flex direction="column" gap="3">
                                                    <TextField.Root
                                                        defaultValue={individual?.language}
                                                        placeholder="Preferred Language"
                                                        name="language"
                                                        disabled={!editMode}
                                                    />
                                                    <TextField.Root
                                                        defaultValue={individual?.timezone}
                                                        placeholder="Timezone"
                                                        name="timezone"
                                                        disabled={!editMode}
                                                    />
                                                </Flex>
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

