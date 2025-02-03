"use client"
import { Investigation } from '@/src/types/investigation';
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
                <div className='w-[240px] flex flex-col rounded-none shadow-none border-r border-gray-400/20'>
                    <div className='w-full rounded-none shadow-none h-12 border-b border-gray-400/20 flex items-center flex-row justify-end p-2'>
                        <NewCase />
                    </div>
                    <div className='p-3'>
                        <div className="flex flex-col">
                            <p className="text-md">{investigation.title}</p>
                            <p className="text-sm opacity-60">{investigation.description}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className='grow flex flex-col'>
                <div className='w-full rounded-none shadow-none h-12 justify-between border-b border-gray-400/20 flex flex-row items-center p-2'>
                    <CaseSelector />
                    <MoreMenu />
                </div>
                {children}
            </div></div>
    )
}

export default InvestigationLayout