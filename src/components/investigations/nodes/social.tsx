"use client"
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, Box, Text, ContextMenu, Flex, Inset, Badge, Tooltip, Avatar } from '@radix-ui/themes';
import { NodeProvider, useNodeContext } from './node-context';
import { cn } from '@/utils';
import { useInvestigationContext } from '../investigation-provider';
import { usePlatformIcons } from '@/src/lib/hooks/use-platform-icons';

function Custom({ data }: any) {
    const { handleDeleteNode, loading } = useNodeContext()
    const { settings } = useInvestigationContext()
    const platformsIcons = usePlatformIcons()
    return (
        <>
            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    <Box className={cn(loading ? "!opacity-40" : "!opacity-100")}>
                        {settings.showNodeLabel ?
                            <Card>
                                <Inset>
                                    <Flex className='items-center p-0'>
                                        {/* @ts-ignore */}
                                        <Badge color={platformsIcons?.[data?.platform]?.color as any || "amber"}
                                            className='!h-[24px] !rounded-r-none'>
                                            {/* @ts-ignore */}
                                            {platformsIcons?.[data?.platform]?.icon || "?"}
                                        </Badge>
                                        <Box maxWidth={"20px"} className='!max-w-[240px] p-1'>
                                            <Text as="div" size="1" weight="medium">
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
                                        /* @ts-ignore */
                                        color={platformsIcons?.[data?.platform]?.color || "amber"}
                                        src={data?.image_url}
                                        radius="full"
                                        /* @ts-ignore */
                                        fallback={platformsIcons?.[data?.platform]?.icon || "?"}
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