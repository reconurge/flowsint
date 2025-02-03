"use client"
import React from 'react'
import { Investigation } from '@/src/types/investigation';
import Link from 'next/link';
import { Box, Flex, Text, Card } from '@radix-ui/themes';

const investigation = ({ investigation }: { investigation: Investigation }) => {
    return (
        <Link href={`/investigations/${investigation.id}`} >
            <Box className="w-full">
                <Card>
                    <Flex gap="3" align="center">
                        <Box>
                            <Text as="div" size="2" weight="bold">
                                {investigation.title}
                            </Text>
                            <Text as="div" size="2" color="gray">
                                {investigation.description}
                            </Text>
                        </Box>
                    </Flex>
                </Card>
            </Box>
        </Link>
    )
}

export default investigation