import type React from "react"
import { createClient } from "@/src/lib/supabase/server"
import { redirect } from "next/navigation"
import Logo from "@/src/components/logo"
import { Box, Flex, ScrollArea, TextField, Text, IconButton } from "@radix-ui/themes"
import NewCase from "@/src/components/dashboard/new-case"
import { MagnifyingGlassIcon } from "@radix-ui/react-icons"
import User from "@/src/components/user"
import Link from "next/link"
import { PlusIcon } from 'lucide-react';

const navigation = [
    {
        name: "Dashboard",
        children: [
            {
                name: "Your investigations",
                href: "/dashboard",
            },
        ],
    },
    {
        name: "Configuration",
        children: [
            {
                name: "Settings",
                href: "/dashboard/settings",
            },
            {
                name: "API keys",
                href: "/dashboard/keys",
            },
        ],
    },
]

const DashboardLayout = async ({
    children,
}: {
    children: React.ReactNode
}) => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
        redirect("/login")
    }

    return (
        <Flex style={{ height: "100vh", overflow: "hidden" }}>
            {/* Left Panel */}
            <Flex direction="column" style={{ width: "300px", borderRight: "1px solid rgba(128, 128, 128, 0.2)" }}>
                {/* Left Panel Header */}
                <Box
                    style={{
                        height: "48px",
                        borderBottom: "1px solid rgba(128, 128, 128, 0.2)",
                        padding: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Logo />
                    <NewCase>
                        <IconButton color="gray" size="2" variant="soft">
                            <PlusIcon className="h-5" />
                        </IconButton>
                    </NewCase>
                </Box>

                {/* Left Panel Content */}
                <ScrollArea type="auto" scrollbars="vertical" style={{ flex: 1, overflow: "auto" }}>
                    <Flex direction="column" gap="4" p="4">
                        {navigation.map((nav, i) => (
                            <Flex direction="column" gap="1" key={i}>
                                <Text style={{ opacity: 0.6 }} weight="light">
                                    {nav.name}
                                </Text>
                                <Flex direction="column" gap="1">
                                    {nav?.children?.map((child, j) => (
                                        <Link key={j} href={child.href} style={{ color: "inherit", textDecoration: "none" }}>
                                            <Text
                                                className="hover:text-sky-400 hover:underline"
                                                weight="medium"
                                                style={{
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {child.name}
                                            </Text>
                                        </Link>
                                    ))}
                                </Flex>
                            </Flex>
                        ))}
                    </Flex>
                </ScrollArea>
            </Flex>

            {/* Main Content */}
            <Flex direction="column" style={{ flex: 1, overflow: "hidden" }}>
                {/* Top Navigation */}
                <Box
                    style={{
                        height: "48px",
                        borderBottom: "1px solid rgba(128, 128, 128, 0.2)",
                        padding: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <TextField.Root placeholder="Search an investigation..." style={{ width: "100%", maxWidth: "240px", height: "32px" }}>
                        <TextField.Slot>
                            <MagnifyingGlassIcon height="16" width="16" />
                        </TextField.Slot>
                    </TextField.Root>
                    <User user={data?.user} />
                </Box>

                {/* Main Content Area */}
                <ScrollArea type="auto" scrollbars="vertical" style={{ flex: 1, overflowY: "auto" }}>
                    <Box p="24px">{children}</Box>
                </ScrollArea>
            </Flex>
        </Flex>
    )
}

export default DashboardLayout