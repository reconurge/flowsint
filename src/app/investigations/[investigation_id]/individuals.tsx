"use client"
import React from 'react'
import { Skeleton } from '@/components/ui/skeleton';
import { useIndividuals } from '@/lib/hooks/individuals/use-individuals';
import { useInvestigationContext } from '@/components/contexts/investigation-provider';
import { cn } from '@/lib/utils';
import { Pencil1Icon } from '@radix-ui/react-icons';
import { RotateCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Filters = ({ investigation_id }: { investigation_id: string }) => {
    const { individuals, isLoading, refetch } = useIndividuals(investigation_id)
    const { currentNode, setCurrentNode, handleOpenIndividualModal } = useInvestigationContext()

    return (
        <div className='flex flex-col gap-2 p-1'>
            <div className='flex item-center justify-between'><div>Profiles</div>
                <Button size="icon" className='!p-1 !mr-2' disabled={isLoading} onClick={() => refetch()} variant="ghost" >
                    <RotateCwIcon width="15" height="15" />
                </Button>
            </div>
            <div className='flex flex-col gap-2'>
                {isLoading && <>
                    <Skeleton className='w-full h-[30px]' />
                    <Skeleton className='w-full h-[30px]' />
                    <Skeleton className='w-full h-[30px]' />
                </>
                }
                {individuals?.map((individual: any) => (
                    <div key={individual.id}>
                        <Card className={cn('!p-2 relative group cursor-pointer border border-transparent hover:border-sky-400', currentNode === individual.id && 'border-sky-400')} onClick={() => setCurrentNode(individual.id)}>
                            <div className='flex gap-3 items-center'>
                                <Avatar>
                                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                    <AvatarFallback>CN</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div>
                                        {individual.full_name}
                                    </div>
                                    <div>
                                        {individual.notes}
                                    </div>
                                </div>
                            </div>
                            <Button
                                className='!absolute !top-2 !right-2 !hidden group-hover:!block'
                                variant="ghost"
                                size={"icon"}
                                onClick={(e) => { e.stopPropagation(); handleOpenIndividualModal(individual.id) }}
                                aria-label={"Edit profile"}
                            >
                                <Pencil1Icon />
                            </Button>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Filters