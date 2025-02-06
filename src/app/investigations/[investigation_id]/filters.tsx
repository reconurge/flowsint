"use client"
import React from 'react'
import { settings } from './data.js'
import DisplaySelector from '@/src/components/investigations/display-selector';
import { Skeleton, Text } from '@radix-ui/themes';
import { useUsernames } from '@/src/lib/hooks/investigation/usernames';

const Filters = ({ investigation_id }: { investigation_id: string }) => {
    const { usernames, isLoading } = useUsernames(investigation_id)
    return (
        <div className='flex flex-col gap-2'>
            <Text size={"2"}>Display</Text>
            <DisplaySelector values={settings} />
            <Text size={"2"}>Usernames</Text>
            <Skeleton loading={isLoading}>
                <DisplaySelector values={usernames?.map(({ username }) => username) || []} />
            </Skeleton>
        </div>
    )
}

export default Filters