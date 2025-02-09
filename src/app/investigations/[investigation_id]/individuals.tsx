"use client"
import React from 'react'
import { Avatar, Box, Card, Flex, IconButton, Skeleton, Text } from '@radix-ui/themes';
import { useIndividuals } from '@/src/lib/hooks/individuals/use-individuals';
import { useInvestigationContext } from '@/src/components/contexts/investigation-provider';
import { cn } from '@/src/lib/utils';
import { Pencil1Icon } from '@radix-ui/react-icons';

const Filters = ({ investigation_id }: { investigation_id: string }) => {
    const { individuals, isLoading } = useIndividuals(investigation_id)
    const { currentNode, setCurrentNode, handleOpenIndividualModal } = useInvestigationContext()

    return (
        <div className='flex flex-col gap-2'>
            <Text size={"2"}>Profiles</Text>
            <Flex direction={"column"} gap="3">
                {isLoading && <>
                    <Skeleton height={"48px"} />
                    <Skeleton height={"48px"} />
                    <Skeleton height={"48px"} />
                </>
                }
                {individuals?.map((individual: any) => (
                    <Box key={individual.id} maxWidth="240px">
                        <Card className={cn('relative group cursor-pointer border border-transparent hover:border-sky-400', currentNode === individual.id && 'border-sky-400')} onClick={() => setCurrentNode(individual.id)}>
                            <Flex gap="3" align="center">
                                <Avatar
                                    size="3"
                                    src={individual?.image_url}
                                    radius="full"
                                    fallback={individual?.full_name[0]}
                                />
                                <Box>
                                    <Text as="div" size="2" weight="bold">
                                        {individual.full_name}
                                    </Text>
                                    <Text as="div" size="2" color="gray">
                                        {individual.notes}
                                    </Text>
                                </Box>
                            </Flex>
                            <IconButton
                                className='!absolute !top-2 !right-2 !hidden group-hover:!block'
                                type="button"
                                variant="ghost"
                                size={"1"}
                                onClick={(e) => { e.stopPropagation(); handleOpenIndividualModal(individual.id) }}
                                aria-label={"Edit profile"}
                            >
                                <Pencil1Icon />
                            </IconButton>
                        </Card>
                    </Box>
                ))}
            </Flex>
        </div >
    )
}

export default Filters