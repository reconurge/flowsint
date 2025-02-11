"use client"
import React, { memo } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import { Card, Box, Text, ContextMenu, Flex, Inset, Badge, Tooltip, Avatar } from '@radix-ui/themes';
import { NodeProvider, useNodeContext } from '../../contexts/node-context';
import { cn, zoomSelector } from '@/src/lib/utils';
import { useInvestigationContext } from '../../contexts/investigation-provider';
import { usePlatformIcons } from '@/src/lib/hooks/use-platform-icons';
import { CopyButton } from '../../copy';
import { ZapIcon } from 'lucide-react';
import { useSearchContext } from '../../contexts/search-context';

function Custom({ data }: any) {
    const { handleDeleteNode, loading } = useNodeContext()
    const { settings, currentNode } = useInvestigationContext()
    const platformsIcons = usePlatformIcons()
    const { handleOpenSearchModal } = useSearchContext()
    const showContent = useStore(zoomSelector);

    return (
        <>
            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    <Box className={cn(loading ? "!opacity-40" : "!opacity-100")}>
                        {settings.showNodeLabel && showContent ?
                            <Card data-radius='full' className={cn('!pr-4 border border-transparent hover:border-sky-400', currentNode === data.id && "border-sky-400")}>
                                <Inset>
                                    <Flex className='items-center p-0'>
                                        {/* @ts-ignore */}
                                        <Badge color={platformsIcons?.[data?.platform]?.color as any || "amber"}
                                            className='!h-[24px] !rounded-r-none'>
                                            {/* @ts-ignore */}
                                            {platformsIcons?.[data?.platform]?.icon || "?"}
                                        </Badge>
                                        <Flex align={"center"} className='p-1 px-1.5' gap="2">
                                            <Text as="div" size="1" weight="regular">
                                                {data.username || data.profile_url}

                                            </Text>
                                            {settings.showCopyIcon && <CopyButton content={data.username || data.profile_url} />}
                                        </Flex>
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
                    <ContextMenu.Item className='font-bold' onClick={() => handleOpenSearchModal(data.username || data.profile_url)}>Launch search<ZapIcon color='orange' className='h-4 w-4' /></ContextMenu.Item>
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