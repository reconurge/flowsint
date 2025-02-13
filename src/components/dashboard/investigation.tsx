"use client"
import React from 'react'
import { Investigation } from '@/types/investigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
const investigation = ({ investigation }: { investigation: Investigation }) => {
    return (
        <Link href={`/investigations/${investigation.id}`} >
            <div className="w-full h-full">
                <Card className='h-full'>
                    <div className="group relative h-full overflow-hidden rounded-lg">
                        <div className="aspect-[4/3] overflow-hidden">
                            <Image
                                src={"https://c6p3q0oludlschf8w.lite.vusercontent.net/placeholder.svg"}
                                alt={investigation.title}
                                width={400}
                                height={300}
                                className="h-full w-full object-cover transition-transform group-hover:scale-115 dark:invert"
                            />
                        </div>
                        <div className="p-4 h-full">
                            <div>
                                {investigation.title}
                            </div>
                            <div>
                                {investigation.description || <span className='italic'>No description provided.</span>}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </Link>
    )
}

export default investigation