import React from 'react'
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Logo from '@/src/components/logo';
import { Box, Flex, ScrollArea, TextField, Text } from '@radix-ui/themes';
import NewCase from '@/src/components/dashboard/new-case';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import User from '@/src/components/user';
import Link from 'next/link';

const navigation = [
    {
        name: "Dashboard",
        children: [
            {
                name: "Your investigations",
                href: "/dashboard"
            }
        ]
    },
    {
        name: "Configuration",
        children: [
            {
                name: "Settings",
                href: "/dashboard/settings"
            },
            {
                name: "API keys",
                href: "/dashboard/keys"
            }
        ]
    }
]
const DashboardLayout = async ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
        redirect('/login')
    }

    return (
        <Flex className='h-screen w-screen flex'>
            <Flex className='h-screen'>
                <div className='flex flex-col w-[300px] h-full rounded-none shadow-none border-r border-gray-400/20'>
                    <div className='w-full rounded-none shadow-none h-12 border-b border-gray-400/20 flex items-center gap-1 flex-row justify-between p-2'>
                        <Logo />
                        <Flex gap={"1"}>
                            <NewCase />
                        </Flex>
                    </div>
                    <ScrollArea type="auto" scrollbars="vertical" className='p-3 w-full !h-[calc(100vh_-48px)] grow overflow-y-auto'>
                        <Flex direction={"column"} gap="4" className='p-4'>
                            {navigation.map((nav, i) => (
                                <Flex direction={"column"} gap="1" key={i}>
                                    <Text className='opacity-60' weight="light">{nav.name}</Text>
                                    <Flex direction={"column"} gap="1">
                                        {nav?.children?.map((child, i) => (
                                            <Link className='hover:text-sky-400 hover:underline' key={i} href={child.href}><Text weight={"medium"} truncate>{child.name}</Text></Link>
                                        ))}
                                    </Flex>
                                </Flex>
                            ))}
                        </Flex>
                    </ScrollArea>

                </div>
            </Flex>
            <Flex className='grow flex flex-col'>
                <div>
                    <div className='w-full rounded-none shadow-none !h-12 justify-between border-b border-gray-400/20 flex flex-row justify-between items-center p-2'>
                        <TextField.Root placeholder="Search an investigation..." className='w-full max-w-xs !h-8'>
                            <TextField.Slot>
                                <MagnifyingGlassIcon height="16" width="16" />
                            </TextField.Slot>
                        </TextField.Root>
                        <User user={data?.user} />
                    </div>
                    <div className='p-12 h-[calc(100vh_-56px)]'>
                        {children}
                    </div>
                </div>
            </Flex>
        </Flex>

    )
}

export default DashboardLayout