"use client"
import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useInvestigationContext } from '../investigation-provider';
import { Avatar, Card, Box, Flex, Text, ContextMenu, Dialog, TextField, Button, Spinner, Badge, Tooltip, Inset } from '@radix-ui/themes';
import { AtSignIcon, CameraIcon, FacebookIcon, InstagramIcon, LocateIcon, MessageCircleDashedIcon, PhoneIcon, SendIcon, UserIcon } from 'lucide-react';
import { NodeProvider, useNodeContext } from './node-context';
import { cn } from '@/utils';

function Custom({ data }: any) {
    const { settings } = useInvestigationContext()
    const { setOpenAddNodeModal, handleDuplicateNode, handleDeleteNode, loading } = useNodeContext()
    const [open, setOpen] = useState(false);

    return (
        <>
            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    <Box className={cn(loading ? "!opacity-40" : "!opacity-100")}>{settings.showNodeLabel ?
                        <Card className='!py-1' onClick={() => setOpen(true)}>
                            <Flex gap="2" align="center">
                                <Avatar
                                    size="2"
                                    src={data?.image_url}
                                    radius="full"
                                    fallback={loading ? <Spinner /> : data.full_name[0]}
                                />
                                {settings.showNodeLabel &&
                                    <Box>
                                        <Text as="div" size="2" weight="bold">
                                            {data.full_name}
                                        </Text>
                                        <Text as="div" size="2" color="gray">
                                            {data.notes}
                                        </Text>
                                    </Box>}
                            </Flex>
                        </Card> :
                        <Tooltip content={data.full_name}>
                            <button className='!rounded-full border-transparent' onClick={() => setOpen(true)}>
                                    <Avatar
                                        size="3"
                                        src={data?.image_url}
                                        radius="full"
                                        fallback={<UserIcon className='h-4 w-4' />}
                                    />
                            </button>
                        </Tooltip>}
                        <Handle
                            type="target"
                            position={Position.Top}
                            className="w-16 !bg-teal-500"
                        />
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            className="w-16 !bg-teal-500"
                        />
                    </Box>
                </ContextMenu.Trigger>
                <ContextMenu.Content>
                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger >New</ContextMenu.SubTrigger>
                        <ContextMenu.SubContent>
                            <ContextMenu.Item onClick={() => setOpenAddNodeModal("individuals")}><UserIcon className='h-4 w-4' /> New relation</ContextMenu.Item>
                            <ContextMenu.Item onClick={() => setOpenAddNodeModal("phone_numbers", data.id)}><PhoneIcon className='h-4 w-4' />Phone number</ContextMenu.Item>
                            <ContextMenu.Item onClick={() => setOpenAddNodeModal("emails", data.id)}><AtSignIcon className='h-4 w-4' />Email address</ContextMenu.Item>
                            <ContextMenu.Item onClick={() => setOpenAddNodeModal("ip_addresses", data.id)}><LocateIcon className='h-4 w-4' />IP address</ContextMenu.Item>
                            <ContextMenu.Sub>
                                <ContextMenu.SubTrigger >Social account</ContextMenu.SubTrigger>
                                <ContextMenu.SubContent>
                                    <ContextMenu.Item onClick={() => setOpenAddNodeModal("social_accounts_facebook", data.id)}><FacebookIcon className='h-4 w-4' />Facebook</ContextMenu.Item>
                                    <ContextMenu.Item onClick={() => setOpenAddNodeModal("social_accounts_instagram", data.id)}><InstagramIcon className='h-4 w-4' />Instagram</ContextMenu.Item>
                                    <ContextMenu.Item onClick={() => setOpenAddNodeModal("social_accounts_telegram", data.id)}><SendIcon className='h-4 w-4' />Telegram</ContextMenu.Item>
                                    <ContextMenu.Item onClick={() => setOpenAddNodeModal("social_accounts_signal", data.id)}><MessageCircleDashedIcon className='h-4 w-4' />Signal</ContextMenu.Item>
                                    <ContextMenu.Item onClick={() => setOpenAddNodeModal("social_accounts_snapchat", data.id)}><CameraIcon className='h-4 w-4' />Snapchat</ContextMenu.Item>
                                    <ContextMenu.Item disabled onClick={() => setOpenAddNodeModal("social_accounts_coco", data.id)}>Coco <Badge radius='full'>soon</Badge></ContextMenu.Item>
                                </ContextMenu.SubContent>
                            </ContextMenu.Sub>
                        </ContextMenu.SubContent>
                    </ContextMenu.Sub>
                    <ContextMenu.Item onClick={() => setOpen(true)}>View and edit</ContextMenu.Item>
                    <ContextMenu.Item onClick={handleDuplicateNode}>Duplicate</ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item onClick={handleDeleteNode} shortcut="⌘ ⌫" color="red">
                        Delete
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Root>
            <Dialog.Root open={open} onOpenChange={setOpen}>
                <Dialog.Content maxWidth="40vw">
                    <Dialog.Title>{data.full_name}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        {data.notes}
                    </Dialog.Description>

                    <Flex direction="column" gap="3">
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                Name
                            </Text>
                            <TextField.Root
                                defaultValue={data?.full_name}
                                placeholder="Enter your full name"
                                name="full_name"
                            />
                        </label>
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                Email
                            </Text>
                            <TextField.Root
                                defaultValue="freja@example.com"
                                placeholder="Enter your email"
                            />
                        </label>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                Cancel
                            </Button>
                        </Dialog.Close>
                        <Dialog.Close>
                            <Button>Save</Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </>
    );
}

const IndividualNode = (props: any) => (
    <NodeProvider>
        <Custom {...props} />
    </NodeProvider>
);

export default memo(IndividualNode);