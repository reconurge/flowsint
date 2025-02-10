"use client"
import React from 'react'
import { Investigation } from '@/src/types/investigation';
import Link from 'next/link';
import { Box, Card, Inset, Text } from '@radix-ui/themes';
import Image from 'next/image';
const investigation = ({ investigation }: { investigation: Investigation }) => {
    return (
        <Link href={`/investigations/${investigation.id}`} >
            <Box className="w-full h-full">
                <Card className='h-full hover:border-sky-400 border border-transparent'>
                    <Inset>
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
                                <Text as="div" size="2" weight="bold">
                                    {investigation.title}
                                </Text>
                                <Text as="div" size="2" color="gray">
                                    {investigation.description || <span className='italic'>No description provided.</span>}
                                </Text>
                            </div>
                        </div>
                    </Inset>
                </Card>
            </Box>
        </Link>
    )
}

export default investigation