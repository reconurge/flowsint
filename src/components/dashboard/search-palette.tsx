"use client"

import { useState, useCallback, useEffect, SetStateAction } from 'react'
// @ts-ignore
import debounce from "lodash.debounce"
import { Search } from 'lucide-react'
// @ts-ignore
import Highlighter from "react-highlight-words"
import { useSearchResults } from '../../lib/hooks/investigation/use-search-results'
import { useInvestigationContext } from '../contexts/investigation-provider'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

const SearchModal = ({ investigation_id }: { investigation_id: string }) => {
    const [search, setSearch] = useState("")
    const [open, setOpen] = useState(false)
    const { setCurrentNode } = useInvestigationContext()
    const {
        results,
        error,
        isLoading,
        refetch,
    } = useSearchResults(search, investigation_id)

    const changeHandler = (event: { target: { value: SetStateAction<string> } }) => {
        setSearch(event.target.value)
        refetch && refetch()
    }
    const debouncedChangeHandler = useCallback(debounce(changeHandler, 300), [])

    const handleClose = () => {
        setSearch('')
        setOpen(false)
    }

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === 'k') {
                setOpen(true)
            }
        }
        window.addEventListener('keydown', handleKeyPress)
        return () => {
            window.removeEventListener('keydown', handleKeyPress)
        }
    }, [])

    const SearchItem = ({ item }: any) => (
        <li onClick={() => setOpen(false)}>
            <Card className='cursor-pointer hover:border-primary border border-transparent' onClick={() => setCurrentNode(item.id)}>
                <CardContent className='p-3'>
                    <div className='flex flex-col gap-1 text-left'>
                        <span className='text-xs text-muted-foreground'>Individual</span>
                        <div className='flex items-center flex-col items-start gap-1'>
                            <span className='truncate'>
                                <Highlighter
                                    searchWords={search.split(" ")}
                                    autoEscape={true}
                                    textToHighlight={item?.full_name}
                                />
                            </span>
                            <span className='truncate text-ellipsis text-sm text-muted-foreground'>
                                <Highlighter
                                    searchWords={search.split(" ")}
                                    autoEscape={true}
                                    textToHighlight={item?.notes}
                                />
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </li>
    )

    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
                    <Search className="h-4 w-4" />
                </Button>
                <DialogContent className="min-h-none">
                    <DialogHeader>
                        <DialogTitle>Search</DialogTitle>
                        <DialogDescription>
                            Find the profile you're looking for.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            defaultValue={search}
                            onChange={debouncedChangeHandler}
                            placeholder="Your search here…"
                        />
                        <div className='w-full relative text-center flex flex-col items-center justify-center gap-2'>
                            {error && <p className="text-red-500">An error occurred.</p>}
                            {isLoading && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>}
                            {results?.length === 0 && <p>No results found for "{search}".</p>}
                            {results && results?.length !== 0 && <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
                                <ul className='space-y-2'>
                                    {!error && !isLoading && Array.isArray(results) && results?.map((item) => (
                                        <SearchItem key={item.id} item={item} />
                                    ))}
                                </ul>
                            </ScrollArea>}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default SearchModal
