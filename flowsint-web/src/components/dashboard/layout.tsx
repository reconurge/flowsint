import React, { Fragment } from 'react'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from '../ui/button'
import { BellIcon, CircleHelpIcon } from 'lucide-react'
import Link from 'next/link'
import Feedback from './feedback'

interface BreadCrumbItem {
    name: string
    href?: string | null
    icon?: React.ReactNode
}
const DashboardLayout = ({ children, items = [] }: { children: React.ReactNode, items: BreadCrumbItem[] }) => {
    return (
        <>
            <div className='w-full px-4 bg-sidebar sticky top-0 rounded-none shadow-none z-50 h-12 justify-between border-b flex flex-row items-center'>
                <Breadcrumb>
                    <BreadcrumbList>
                        {items.map((item: BreadCrumbItem, index: number) => (
                            <Fragment key={index}>
                                <BreadcrumbItem>
                                    {item.icon && <span className='mr-1'>{item.icon}</span>}
                                    {item.href ?
                                        <BreadcrumbLink asChild ><Link href={item.href}>{item.name}</Link></BreadcrumbLink>
                                        : <BreadcrumbPage>{item.name}</BreadcrumbPage>
                                    }
                                </BreadcrumbItem>
                                {index < items.length - 1 && (
                                    <Fragment>
                                        <BreadcrumbSeparator />
                                    </Fragment>
                                )}
                            </Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
                <div className='flex gap-1 items-center'>
                    <Feedback />
                    <Button variant={"ghost"} size={"icon"}><BellIcon className='h-4 w-4  opacity-60' /></Button>
                    <Button variant={"ghost"} size={"icon"}><CircleHelpIcon className='h-4 w-4  opacity-60' /></Button>
                </div>
            </div>
            {children}
        </>
    )
}

export default DashboardLayout