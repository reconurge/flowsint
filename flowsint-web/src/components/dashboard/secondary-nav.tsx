"use client"
import React from 'react'
import { Button } from '../ui/button'
import Feedback from './feedback'
import { NavUser } from '../nav-user'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { SparklesIcon } from 'lucide-react'

const SecondaryNav = ({ profile_id }: { profile_id: string }) => {
    const { sketch_id } = useParams()
    return (
        <div className="ml-auto flex items-center space-x-2">
            <div className="lg:flex hidden items-center space-x-2">
                {sketch_id &&
                    <Link href="/dashboard/transforms">
                        <Button size={"sm"} className='rounded-full px-2' variant={"outline"}><SparklesIcon className='opacity-60 text-primary' />Transforms</Button>
                    </Link>
                }
                <Feedback />
                <Button size={"sm"} variant={"ghost"}>Changelog</Button>
                <Button size={"sm"} variant={"ghost"}>Docs</Button>
            </div>
            <NavUser />
        </div>
    )
}

export default SecondaryNav