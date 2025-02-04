"use client"
import React, { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, Box, Text, ContextMenu, Flex, Inset, Badge, Tooltip, Avatar } from '@radix-ui/themes';
import { NodeProvider, useNodeContext } from './node-context';
import { CameraIcon, FacebookIcon, InstagramIcon, MessageCircleDashedIcon, SendIcon } from 'lucide-react';
import { cn } from '@/utils';
import { useInvestigationContext } from '../investigation-provider';

function Custom({ data }: any) {
    const { handleDeleteNode, loading } = useNodeContext()
    const { settings } = useInvestigationContext()

    const platformsIcons = useMemo(() => ({
        "facebook": <FacebookIcon className='h-3 w-3' />,
        "instagram": <InstagramIcon className='h-3 w-3' />,
        "telegram": <SendIcon className='h-3 w-3' />,
        "signal": <MessageCircleDashedIcon className='h-3 w-3' />,
        "snapchat": <CameraIcon className='h-3 w-3' />
    }), [])
    return (
        <>
            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    <Box className={cn(loading ? "!opacity-40" : "!opacity-100")}>
                        {settings.showNodeLabel ?
                            <Card>
                                <Inset>
                                    <Flex className='items-center p-0'>
                                        <Badge className='!h-[24px] !rounded-r-none'>
                                            {/* @ts-ignore */}
                                            {platformsIcons[data.platform]}
                                        </Badge>
                                        <Box maxWidth={"20px"} className='!max-w-[240px] p-1'>
                                            <Text as="div" size="1" weight="medium" color='blue' className='truncate text-ellipsis underline'>
                                                {data.username || data.profile_url}
                                            </Text>
                                        </Box>
                                    </Flex>
                                </Inset>
                            </Card>
                            :
                            <Tooltip content={data.username || data.profile_url}>
                                <button className='!rounded-full border-transparent'>
                                    <Avatar
                                        size="1"
                                        src={data?.image_url}
                                        radius="full"
                                        /* @ts-ignore */
                                        fallback={platformsIcons[data.platform]}
                                    />
                                </button>
                            </Tooltip>}
                        <Handle
                            type="target"
                            position={Position.Top}
                            className="w-16 !bg-teal-500"
                        />
                    </Box>
                </ContextMenu.Trigger>
                <ContextMenu.Content>
                    <ContextMenu.Item shortcut="⌘ C">Copy content</ContextMenu.Item>
                    <ContextMenu.Item shortcut="⌘ D">Duplicate</ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item onClick={handleDeleteNode} shortcut="⌘ ⌫" color="red">
                        Delete
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Root >
        </>
    );
}

const SocialNode = (props: any) => (
    <NodeProvider>
        <Custom {...props} />
    </NodeProvider>
);

export default memo(SocialNode);