"use client"
import React, { memo } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import { Card, Box, Text, ContextMenu, Flex, Inset, Badge, Tooltip, Avatar } from '@radix-ui/themes';
import { NodeProvider, useNodeContext } from '../../contexts/node-context';
import { LocateIcon, ZapIcon } from 'lucide-react';
import { cn, zoomSelector } from '@/src/lib/utils';
import { useInvestigationContext } from '../../contexts/investigation-provider';
import { CopyButton } from '../../copy';
import { useSearchContext } from '../../contexts/search-context';

function Custom({ data }: any) {
    const { handleDeleteNode, loading } = useNodeContext()
    const { settings, currentNode } = useInvestigationContext()
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
                                        <Badge color='orange' className='!h-[24px] !rounded-r-none'>
                                            <LocateIcon className='h-3 w-3' />
                                        </Badge>
                                        <Flex align={"center"} className='p-1 px-1.5' gap="2">
                                            <Text as="div" size="1" weight="regular">
                                                {data.label}
                                            </Text>
                                            {settings.showCopyIcon && <CopyButton content={data.label} />}
                                        </Flex>
                                    </Flex>
                                </Inset>
                            </Card>
                            :
                            <Tooltip content={data.label}>
                                <button className='!rounded-full border-transparent'>
                                    <Avatar
                                        size="1"
                                        src={data?.image_url}
                                        radius="full"
                                        /* @ts-ignore */
                                        fallback={<LocateIcon className='h-3 w-3' />}
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
                    <ContextMenu.Item className='font-bold' onClick={() => handleOpenSearchModal(data.ip_address)}>Launch search<ZapIcon color='orange' className='h-4 w-4' /></ContextMenu.Item>
                    <ContextMenu.Item shortcut="⌘ C">Copy content</ContextMenu.Item>
                    <ContextMenu.Item shortcut="⌘ D">Duplicate</ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item onClick={handleDeleteNode} shortcut="⌘ ⌫" color="red">
                        Delete
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Root>
        </>
    );
}

const IpNode = (props: any) => (
    <NodeProvider>
        <Custom {...props} />
    </NodeProvider>
);

export default memo(IpNode);