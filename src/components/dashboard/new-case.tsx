"use client"
import { DropdownMenu, Button, Dialog, Flex, TextField, Text, Badge, Box } from "@radix-ui/themes";
import { useState } from "react";
import { supabase } from '@/src/lib/supabase/client';
import { useRouter } from "next/navigation";

export default function NewCase({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    async function handleNewCase(e: { preventDefault: () => void; currentTarget: HTMLFormElement | undefined; }) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget))
        const investigation = await supabase.from("investigations").insert(data).select("id")
            .single()
            .then(({ data, error }) => {
                if (error)
                    throw error
                return data
            })
        if (investigation)
            router.push(`/investigations/${investigation.id}`)
        setOpen(false)
    }
    return (
        <>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    {children}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content size="2">
                    <DropdownMenu.Item onClick={() => setOpen(true)} shortcut="⌘ E">New case</DropdownMenu.Item>
                    <DropdownMenu.Item disabled shortcut="⌘ D">New organization <Badge radius="full" color="orange" size={"1"}>Soon</Badge></DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
            <Dialog.Root open={open} onOpenChange={setOpen}>
                <Dialog.Content maxWidth="450px">
                    <form onSubmit={handleNewCase}>
                        <Box>
                            <Dialog.Title>New case</Dialog.Title>
                            <Dialog.Description size="2" mb="4">
                                Create a new blank case.
                            </Dialog.Description>
                            <Flex direction="column" gap="3">
                                <label>
                                    <Text as="div" size="2" mb="1" weight="bold">
                                        Investigation name
                                    </Text>
                                    <TextField.Root
                                        required
                                        name="title"
                                        placeholder="Suspicion de fraude"
                                    />
                                </label>
                                <label>
                                    <Text as="div" size="2" mb="1" weight="bold">
                                        Description
                                    </Text>
                                    <TextField.Root
                                        name="description"
                                        placeholder="Investigation sur une campagne de phishing via LinkedIn."
                                    />
                                </label>
                            </Flex>
                            <Flex gap="3" mt="4" justify="end">
                                <Dialog.Close>
                                    <Button variant="soft" color="gray">
                                        Cancel
                                    </Button>
                                </Dialog.Close>
                                <Button type="submit">Save</Button>
                            </Flex>
                        </Box>
                    </form>
                </Dialog.Content>
            </Dialog.Root >
        </>
    );
}
