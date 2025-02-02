"use client"
import { Investigation } from '@/src/types/investigation';
import { Button } from '@heroui/button';
import { Card, CardBody, CardFooter, CardHeader, Divider } from '@heroui/react';
import React from 'react'
import { ThemeSwitch } from '../theme-switch';
import MoreMenu from './more-menu';
import CaseSelector from './case-selector';
import NewCase from '../dashboard/new-case';

const InvestigationLayout = ({
    children,
    investigation
}: {
    children: React.ReactNode;
    investigation: Investigation
}) => {
    return (
        <div className='h-screen w-screen flex'>
            <div className='flex'>
                <Card className='w-[240px] rounded-none shadow-none border-r border-foreground/10'>
                    <Card className='w-full rounded-none shadow-none h-12 border-b border-foreground/10 flex items-center flex-row justify-end p-2'>
                        <NewCase />
                    </Card>
                    <CardHeader>
                        <div className="flex flex-col">
                            <p className="text-md">{investigation.title}</p>
                            <p className="text-sm opacity-60">{investigation.description}</p>
                        </div>
                    </CardHeader>
                    <CardBody className='grow'>
                        <CaseSelector />

                    </CardBody>
                    <CardFooter>
                        <div className='flex w-full items-center justify-end'>
                            <ThemeSwitch />
                        </div>
                    </CardFooter>
                </Card>
            </div>
            <div className='grow flex flex-col'>
                <Card className='w-full rounded-none shadow-none h-12 justify-end border-b border-foreground/10 flex flex-row items-center p-2'>
                    <MoreMenu />
                </Card>
                {children}
            </div></div>
    )
}

export default InvestigationLayout