"use client"
import React, { createContext, useContext, ReactNode, useState } from "react";
import { Button, Callout, Card, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { investigateValue } from "@/src/lib/actions/search";
import { useParams } from "next/navigation";
import Breaches from "../breach";

interface SearchContextType {
    openSearchModal: boolean,
    handleOpenSearchModal: any
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

interface SearchProviderProps {
    children: ReactNode;
}

export const SearchProvider: React.FC<SearchProviderProps> = (props: any) => {
    const [openSearchModal, setOpenSearchModal] = useState(false)
    const { investigation_id } = useParams()
    const [value, setValue] = useState<string | null>(null)
    const [results, setResults] = useState<null | any>()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const onSubmitNewSearch = async (e: React.FormEvent) => {
        if (!value) return setError("No value to search for.")
        e.preventDefault()
        setIsLoading(true)
        setError("")
        try {
            const data = await investigateValue(investigation_id, value)
            setResults(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occured.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleOpenSearchModal = (val: string) => {
        setValue(val)
        setOpenSearchModal(true)
    }

    const handleCloseModal = () => {
        setValue("")
        setError("")
        setResults(null)
        setOpenSearchModal(false)
    }

    return (
        <SearchContext.Provider {...props} value={{ openSearchModal, handleOpenSearchModal }}>
            {props.children}
            <Dialog.Root open={openSearchModal} onOpenChange={handleCloseModal}>
                <Dialog.Content maxWidth={results ? "950px" : "450px"}>
                    <Dialog.Title>New search</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Make a new keyword associated research.
                    </Dialog.Description>
                    <form onSubmit={onSubmitNewSearch}>
                        <Flex direction="column" gap="3">
                            <Card><Text weight={"regular"}>value: </Text><Text weight={"medium"}>"{value}"</Text></Card>
                            {/* <Callout.Root size="1">
                                <Callout.Icon>
                                    <InfoCircledIcon />
                                </Callout.Icon>
                                <Callout.Text>
                                    This query may return some (a lot) or no results. Make sure you filter your results manually afterwards.
                                </Callout.Text>
                            </Callout.Root> */}
                            {error &&
                                <Callout.Root color="red" size="1">
                                    <Callout.Icon>
                                        <InfoCircledIcon />
                                    </Callout.Icon>
                                    <Callout.Text>
                                        {JSON.stringify(error)}
                                    </Callout.Text>
                                </Callout.Root>}
                            {results && Array.isArray(results) ?
                                <>
                                    <Callout.Root color="orange" size="1">
                                        <Callout.Icon>
                                            <InfoCircledIcon />
                                        </Callout.Icon>
                                        <Callout.Text>
                                            "{value}" has appeared in {results.length} data breach(es). Here are the infos we have:
                                        </Callout.Text>
                                    </Callout.Root>
                                    <Breaches breaches={results} />
                                </> : results && <Callout.Root color="green" size="1">
                                    <Callout.Icon>
                                        <InfoCircledIcon />
                                    </Callout.Icon>
                                    <Callout.Text>
                                        {JSON.stringify(results)}
                                    </Callout.Text>
                                </Callout.Root>
                            }
                        </Flex>
                        <Flex gap="3" mt="4" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">
                                    Close
                                </Button>
                            </Dialog.Close>
                            {!results &&
                                <Button autoFocus loading={isLoading} type="submit">Save</Button>
                            }
                        </Flex>
                    </form>
                </Dialog.Content>
            </Dialog.Root>
        </SearchContext.Provider>
    );
};

export const useSearchContext = (): SearchContextType => {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error("useSearchContext must be used within a SearchProvider");
    }
    return context;
};