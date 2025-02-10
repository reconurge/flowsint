"use client"
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useInvestigationContext } from '../../contexts/investigation-provider';
import { Avatar, Card, Box, Flex, Text, ContextMenu, Spinner, Badge, Tooltip } from '@radix-ui/themes';
import { AtSignIcon, CameraIcon, FacebookIcon, InstagramIcon, LocateIcon, MessageCircleDashedIcon, PhoneIcon, SendIcon, UserIcon, MapPinHouseIcon, ZapIcon, BotIcon } from 'lucide-react';
import { NodeProvider, useNodeContext } from '../../contexts/node-context';
import { useSearchContext } from '../../contexts/search-context';
import { cn } from '@/src/lib/utils';
import { CopyButton } from '../../copy';
import { useChatContext } from '../../contexts/chatbot-context';

function Custom(props: any) {
    const { settings, handleOpenIndividualModal, currentNode } = useInvestigationContext()
    const { setOpenAddNodeModal, handleDuplicateNode, handleDeleteNode, loading } = useNodeContext()
    const { handleOpenSearchModal } = useSearchContext()
    const { setOpen: setOpenChat } = useChatContext()
    const { data } = props
    return (
        <>
            <ContextMenu.Root>
                <ContextMenu.Trigger onContextMenu={(e) => { e.stopPropagation() }}>
                    <Box className={cn(loading ? "!opacity-40" : "!opacity-100")}>{settings.showNodeLabel ?
                        <Card onDoubleClick={() => handleOpenIndividualModal(data.id)} className={cn('!py-1 border border-transparent hover:border-sky-400', currentNode === data.id && "border-sky-400")}>
                            <Flex gap="2" align="center">
                                <Avatar
                                    color='gray'
                                    size="2"
                                    src={data?.image_url}
                                    radius="full"
                                    fallback={loading ? <Spinner /> : data.full_name[0]}
                                />
                                {settings.showNodeLabel &&
                                    <Flex align={"center"} gap="2">
                                        <Text as="div" size="1" weight="regular">
                                            {data.full_name}
                                        </Text>
                                        <CopyButton content={data.full_name} />
                                    </Flex>}
                            </Flex>
                        </Card> :
                        <Tooltip content={data.full_name}>
                            <button onDoubleClick={() => handleOpenIndividualModal(data.id)} className={cn('rounded-full border border-transparent hover:border-sky-400', currentNode === data.id && "border-sky-400")}>
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
                    <ContextMenu.Item className='font-bold' onClick={() => handleOpenSearchModal(data.full_name)}>Launch search<ZapIcon color='orange' className='h-4 w-4' /></ContextMenu.Item>
                    <ContextMenu.Item className='font-bold' onClick={() => setOpenChat(true)}>Ask AI<BotIcon color='#12A594' className='h-4 w-4' /></ContextMenu.Item>
                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger >New</ContextMenu.SubTrigger>
                        <ContextMenu.SubContent>
                            <ContextMenu.Item onClick={(e) => setOpenAddNodeModal(e, "individuals")}><UserIcon className='h-4 w-4 opacity-60' /> New relation</ContextMenu.Item>
                            <ContextMenu.Item onClick={(e) => setOpenAddNodeModal(e, "phone_numbers", data.id)}><PhoneIcon className='h-4 w-4 opacity-60' />Phone number</ContextMenu.Item>
                            <ContextMenu.Item onClick={(e) => setOpenAddNodeModal(e, "physical_addresses", data.id)}><MapPinHouseIcon className='h-4 w-4 opacity-60' />Physical address</ContextMenu.Item>
                            <ContextMenu.Item onClick={(e) => setOpenAddNodeModal(e, "emails", data.id)}><AtSignIcon className='h-4 w-4 opacity-60' />Email address</ContextMenu.Item>
                            <ContextMenu.Item onClick={(e) => setOpenAddNodeModal(e, "ip_addresses", data.id)}><LocateIcon className='h-4 w-4 opacity-60' />IP address</ContextMenu.Item>
                            <ContextMenu.Sub>
                                <ContextMenu.SubTrigger >Social account</ContextMenu.SubTrigger>
                                <ContextMenu.SubContent>
                                    <ContextMenu.Item onClick={(e) => setOpenAddNodeModal(e, "social_accounts_facebook", data.id)}><FacebookIcon className='h-4 w-4 opacity-60' />Facebook</ContextMenu.Item>
                                    <ContextMenu.Item onClick={(e) => setOpenAddNodeModal(e, "social_accounts_instagram", data.id)}><InstagramIcon className='h-4 w-4 opacity-60' />Instagram</ContextMenu.Item>
                                    <ContextMenu.Item onClick={(e) => setOpenAddNodeModal(e, "social_accounts_telegram", data.id)}><SendIcon className='h-4 w-4 opacity-60' />Telegram</ContextMenu.Item>
                                    <ContextMenu.Item onClick={(e) => setOpenAddNodeModal(e, "social_accounts_signal", data.id)}><MessageCircleDashedIcon className='h-4 w-4 opacity-60' />Signal</ContextMenu.Item>
                                    <ContextMenu.Item onClick={(e) => setOpenAddNodeModal(e, "social_accounts_snapchat", data.id)}><CameraIcon className='h-4 w-4 opacity-60' />Snapchat</ContextMenu.Item>
                                    <ContextMenu.Item disabled onClick={(e) => setOpenAddNodeModal(e, "social_accounts_coco", data.id)}>Coco <Badge radius='full'>soon</Badge></ContextMenu.Item>
                                </ContextMenu.SubContent>
                            </ContextMenu.Sub>
                        </ContextMenu.SubContent>
                    </ContextMenu.Sub>
                    <ContextMenu.Item onClick={() => handleOpenIndividualModal(data.id)}>View and edit</ContextMenu.Item>
                    <ContextMenu.Item onClick={handleDuplicateNode}>Duplicate</ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item onClick={handleDeleteNode} shortcut="⌘ ⌫" color="red">
                        Delete
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Root >
        </>
    );
}

const IndividualNode = (props: any) => (
    <NodeProvider>
        <Custom {...props} />
    </NodeProvider>
);

export default memo(IndividualNode);