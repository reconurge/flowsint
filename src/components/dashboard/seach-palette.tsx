"use client"
import { useState, useCallback, useEffect, SetStateAction } from 'react'
// @ts-ignore
import debounce from "lodash.debounce";
import { SearchIcon } from "lucide-react"
// @ts-ignore
import Highlighter from "react-highlight-words";
import Link from 'next/link';
import { useSearchResults } from '../../lib/hooks/investigation/use-search-results';
import { Card, Dialog, IconButton, Spinner, TextField } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useInvestigationContext } from '../contexts/investigation-provider';

const SearchModal = ({ investigation_id }: { investigation_id: string }) => {
    const [search, setSearch] = useState("")
    const [open, setOpen] = useState(false)
    const { setCurrentNode } = useInvestigationContext()
    const {
        results,
        error,
        isLoading,
        refetch,
    } = useSearchResults(search, investigation_id);

    const changeHandler = (event: { target: { value: SetStateAction<string>; }; }) => {
        setSearch(event.target.value);
        refetch && refetch();
    };
    const debouncedChangeHandler = useCallback(debounce(changeHandler, 300), []);

    const handleClose = () => {
        () => setSearch('')
        setOpen(false)
    }

    useEffect(() => {
        const handleKeyPress = (event: { ctrlKey: any; key: string; }) => {
            if (event.ctrlKey && event.key === 'k') {
                setOpen(true)
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, []);

    const SearchItem = ({ item }: any) =>
    (<li onClick={() => setOpen(false)}>
        <Card className='cursor-pointer hover:border-sky-400 border border-transparent' onClick={() => setCurrentNode(item.id)}>
            <span className='flex flex-col gap-1 text-left'>
                <span className='text-xs opacity-50'>Individual</span>
                <span className='flex items-center gap-1'>
                    <span className='truncate text-ellipsis'>
                        <Highlighter
                            searchWords={search.split(" ")}
                            autoEscape={true}
                            textToHighlight={item?.full_name}
                        />
                    </span>
                    <span className='truncate text-ellipsis text-sm opacity-75'>
                        <Highlighter
                            searchWords={search.split(" ")}
                            autoEscape={true}
                            textToHighlight={item?.notes}
                        />
                    </span>
                </span>
                {/* <span className='text-sm opacity-75'>
                    <Highlighter
                        searchWords={search.split(" ")}
                        autoEscape={true}
                        textToHighlight={item.netname}
                    />
                </span> */}
            </span>
        </Card>
    </li>
    )
    return (
        <>

            <Dialog.Root open={open} onOpenChange={handleClose}>
                <IconButton onClick={() => setOpen(true)} color="gray" size="2" variant="soft">
                    <SearchIcon className="h-4" />
                </IconButton>
                <Dialog.Content maxWidth="450px">
                    <Dialog.Title>Search</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Find the profile you're looking for.
                    </Dialog.Description>

                    <TextField.Root
                        defaultValue={search}
                        onChange={debouncedChangeHandler}
                        placeholder="Your search here…">
                        <TextField.Slot>
                            <MagnifyingGlassIcon height="16" width="16" />
                        </TextField.Slot>
                    </TextField.Root>
                    <div className='min-h-[20vh] max-h-[60vh] w-full relative text-center flex flex-col items-center justify-center gap-2'>
                        {error && "An error occured."}
                        {isLoading && <Spinner />}
                        {results?.length === 0 && `No results found for "${search}".`}
                        <ul className='w-full h-full flex flex-col gap-1 overflow-auto mt-2'>{!error && !isLoading && Array.isArray(results) && results?.map((item) => (
                            <SearchItem key={item.id} item={item} />
                        ))}
                        </ul>
                        {search === '' && (
                            <div className="px-6 py-14 text-center flex items-center justify-center flex-col text-sm sm:px-14">
                                <SearchIcon
                                    className="h-12 w-12 opacity-40"
                                    aria-hidden="true"
                                />
                                <p className="mt-4 font-semibold">Search for ip_addresses, domain names and other</p>
                                <p className="mt-2 opacity-70">
                                    Put you search between quotes for an exact match search.
                                </p>
                            </div>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Root>
        </>
    )
}

export default SearchModal