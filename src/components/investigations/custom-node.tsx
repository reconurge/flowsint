"use client"
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerBody,
    DrawerFooter,
    Button,
    useDisclosure,
    Accordion,
    AccordionItem,
    DateInput,
    Avatar,
} from "@heroui/react";
import { useInvestigationContext } from './investigation-provider';


function CustomNode({ data }: any) {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const { settings } = useInvestigationContext()
    return (
        <>
            <div onClick={onOpen} className="px-4 py-2 rounded-md bg-background border-2 border-foreground/10">
                <div className="flex">
                    <Avatar showFallback src="https://images.unsplash.com/broken" />
                    {settings.showNodeLabel && <div className="ml-2">
                        <div className="text-lg font-bold">{data.full_name}</div>
                        <div className="text-gray-500">{data.notes}</div>
                    </div>}
                </div>
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
            </div>
            <Drawer backdrop="blur" isOpen={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent>
                    {(onClose) => (
                        <>
                            <DrawerHeader className="flex flex-col gap-1">{data.full_name}</DrawerHeader>
                            <DrawerBody>
                                <p className='opacity-60'>
                                    {data.notes}
                                </p>
                                <DateInput
                                    className="max-w-sm"
                                    label={"Birth date"}
                                />
                                <Accordion>
                                    <AccordionItem key="1" aria-label="Social accounts" title={"Social accounts"}>
                                        <ul>
                                            {data?.social_accounts?.map((account: any) => (
                                                <li className='flex items-center justify-between' key={account.id}>{account.platform}<a className='underline text-primary' href={account.profile_url}>{account.username}</a></li>
                                            ))}
                                        </ul>
                                    </AccordionItem>
                                    <AccordionItem key="2" aria-label="Accordion 2" title={"IP Addresses"}>
                                        <ul>
                                            {data?.ip_addresses?.map((ip: any) => (
                                                <li className='flex items-center justify-between' key={ip.id}>{ip.ip_address}<span>{ip.geolocation?.city}, {ip.geolocation?.country}</span></li>
                                            ))}
                                        </ul>
                                    </AccordionItem>
                                    <AccordionItem key="3" aria-label="Accordion 3" title={"Phone numbers"}>
                                        <ul> {data?.phone_numbers?.map((number: any) => (
                                            <li className='flex items-center justify-between' key={number.id}>{number.phone_number}<span>{number.country}</span></li>
                                        ))}
                                        </ul>
                                    </AccordionItem>
                                </Accordion>
                            </DrawerBody>
                            <DrawerFooter>
                                <Button color="danger" variant="light" onPress={onClose}>
                                    Close
                                </Button>
                                <Button color="primary" onPress={onClose}>
                                    Action
                                </Button>
                            </DrawerFooter>
                        </>
                    )}
                </DrawerContent>
            </Drawer>
        </>
    );
}

export default memo(CustomNode);