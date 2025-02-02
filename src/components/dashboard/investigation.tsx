"use client"
import React from 'react'
import { Card, CardHeader, CardBody, Divider } from "@heroui/react";
import { Investigation } from '@/src/types/investigation';
import Link from 'next/link';

const investigation = ({ investigation }: { investigation: Investigation }) => {
    return (
        <Card as={Link} href={`/investigations/${investigation.id}`} className="w-full">
            <CardHeader className="flex gap-3">
                <div className="flex flex-col">
                    <p className="text-md">{investigation.title}</p>
                </div>
            </CardHeader>
            <Divider />
            <CardBody>
                <p className='opacity-60 text-sm'>{investigation.description}</p>
            </CardBody>
        </Card>
    )
}

export default investigation