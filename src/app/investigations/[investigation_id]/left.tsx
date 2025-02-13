"use client"
import React from 'react'
import { Skeleton } from '@/components/ui/skeleton';
import { useIndividuals } from '@/lib/hooks/individuals/use-individuals';
import { useInvestigationContext } from '@/components/contexts/investigation-provider';
import { cn } from '@/lib/utils';
import { AtSignIcon, RotateCwIcon, UserIcon } from 'lucide-react';
import { useEmails } from '@/lib/hooks/emails/use-emails';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { useFlowStore } from '@/components/contexts/use-flow-store';


const Left = ({ investigation_id }: { investigation_id: string }) => {
    const { individuals, isLoading: isLoadingIndividuals, refetch: refetchIndividuals } = useIndividuals(investigation_id)
    const { emails, isLoading: isLoadingEmails, refetch: refetchEmails } = useEmails(investigation_id)
    const { currentNode, setCurrentNode } = useFlowStore()

    return (
        <div className='flex flex-col'>
            <Accordion type="single" collapsible defaultValue='individuals'>
                <AccordionItem value="individuals">
                    <AccordionTrigger className='p-2 px-4 hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm rounded-none'>
                        Profiles {!isLoadingIndividuals && <>({individuals?.length})</>}</AccordionTrigger>
                    <AccordionContent>
                        {isLoadingIndividuals && <div className='flex flex-col gap-1'>
                            <Skeleton className='w-full h-[20px] bg-foreground/10 rounded-none' />
                            <Skeleton className='w-full h-[20px] bg-foreground/10 rounded-none' />
                            <Skeleton className='w-full h-[20px] bg-foreground/10 rounded-none' />
                        </div>
                        }
                        <ul>
                            {individuals?.map((individual: any) => (
                                <li className={cn('hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm', currentNode === individual.id && "bg-sidebar-accent text-sidebar-accent-foreground")} key={individual.id}>
                                    <button onClick={() => setCurrentNode(individual.id)} className='flex items-center p-1 px-4 w-full gap-2'>
                                        <UserIcon className='h-3 w-3' />
                                        {individual.full_name}
                                    </button>
                                </li>
                            ))
                            }
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <Accordion type="single" collapsible defaultValue='emails'>
                <AccordionItem value="emails">
                    <AccordionTrigger className='p-2 px-4 hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm rounded-none'>
                        Emails {!isLoadingEmails && <>({emails?.length})</>}</AccordionTrigger>
                    <AccordionContent>
                        {isLoadingEmails && <div className='flex flex-col gap-1'>
                            <Skeleton className='w-full h-[20px] bg-foreground/10 rounded-none' />
                            <Skeleton className='w-full h-[20px] bg-foreground/10 rounded-none' />
                            <Skeleton className='w-full h-[20px] bg-foreground/10 rounded-none' />
                        </div>
                        }
                        <ul>
                            {emails?.map((email: any) => (
                                <li className={cn('hover:bg-sidebar-accent text-sidebar-accent-foreground/60 hover:text-sidebar-accent-foreground text-sm', currentNode === email.id && "bg-sidebar-accent text-sidebar-accent-foreground")} key={email.id}>
                                    <button onClick={() => setCurrentNode(email.id)} className='flex items-center p-1 px-4 w-full gap-2'>
                                        <AtSignIcon className='h-3 w-3' />
                                        {email.email}
                                    </button>
                                </li>
                            ))
                            }
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div >
    )
}

export default Left