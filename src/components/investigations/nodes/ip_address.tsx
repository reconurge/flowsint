"use client"
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, Box, Text, ContextMenu, Flex, Inset, Badge } from '@radix-ui/themes';
import { NodeProvider, useNodeContext } from './node-context';
import { LocateIcon } from 'lucide-react';

function Custom({ data }: any) {
    const { handleDeleteNode } = useNodeContext()

    return (
        <>
            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    <Box>
                        <Card>
                            <Inset>
                                <Flex className='items-center p-0'>
                                    <Badge className='!h-[24px] !rounded-r-none'>
                                        <LocateIcon className='h-3 w-3' />
                                    </Badge>
                                    <Box className='p-1'>
                                        <Text as="div" size="1" weight="regular">
                                            {data.label}
                                        </Text>
                                    </Box>
                                </Flex>
                            </Inset>
                        </Card>
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