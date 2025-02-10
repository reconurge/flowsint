import { Avatar, Button, DropdownMenu, Inset, Text } from '@radix-ui/themes'
import React from 'react'

const User = ({ user }: any) => {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Button className='!mr-1' size={"1"} variant='ghost'>
                    <Inset>
                        <Avatar size={"2"} radius='full' src={user?.user_metadata?.avatar_url} fallback={user?.user_metadata?.user_name?.[0] || "?"} variant="soft" />
                    </Inset>
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className='p-2'>
                <Text weight={"medium"}>{user?.user_metadata?.user_name}</Text>
                <Text weight={"light"} size={"2"} className='opacity-60'>{user?.user_metadata?.email}</Text>
                <DropdownMenu.Item>Profile</DropdownMenu.Item>
                <DropdownMenu.Item>Settings</DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item>API keys</DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}

export default User