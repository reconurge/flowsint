"use client"
import type React from "react"
import { createContext, useContext, type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"
import { investigateValue } from "@/lib/actions/search"
import { useParams } from "next/navigation"
import Breaches from "../breach"

interface SearchContextType {
    openSearchModal: boolean
    handleOpenSearchModal: (val: string) => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

interface SearchProviderProps {
    children: ReactNode
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
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
            const data = await investigateValue(investigation_id as string, value)
            setResults(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred.")
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
        <SearchContext.Provider value={{ openSearchModal, handleOpenSearchModal }}>
            {children}
            <Sheet open={openSearchModal} onOpenChange={handleCloseModal}>
                <SheetContent className={results ? "sm:max-w-[950px]" : "sm:max-w-[450px]"}>
                    <SheetHeader>
                        <SheetTitle>New search</SheetTitle>
                        <SheetDescription>Make a new keyword associated research.</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={onSubmitNewSearch} className="grow flex flex-col">
                        <div className="flex flex-col grow gap-3 p-2">
                            <Card className="p-4 shadow-none">
                                <p>
                                    value: <span className="font-medium">"{value}"</span>
                                </p>
                            </Card>
                            {error && (
                                <Alert variant="destructive">
                                    <InfoIcon className="h-4 w-4" />
                                    <AlertDescription>{JSON.stringify(error)}</AlertDescription>
                                </Alert>
                            )}
                            {results && Array.isArray(results) ? (
                                <>
                                    <Alert variant="destructive">
                                        <InfoIcon className="h-4 w-4" />
                                        <AlertDescription>
                                            "{value}" has appeared in {results.length} data breach(es). Here are the infos we have:
                                        </AlertDescription>
                                    </Alert>
                                    <Breaches breaches={results} />
                                </>
                            ) : (
                                results && (
                                    <Alert variant="default">
                                        <InfoIcon className="h-4 w-4" />
                                        <AlertDescription>{JSON.stringify(results)}</AlertDescription>
                                    </Alert>
                                )
                            )}
                        </div>
                        <SheetFooter className="mt-auto flex flex-row justify-end gap-2">
                            <SheetClose asChild>
                                <Button type="button" variant="outline">
                                    Close
                                </Button>
                            </SheetClose>
                            {!results && (
                                <Button disabled={isLoading} type="submit">
                                    {isLoading ? "Saving..." : "Save"}
                                </Button>
                            )}
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>
        </SearchContext.Provider >
    )
}

export const useSearchContext = (): SearchContextType => {
    const context = useContext(SearchContext)
    if (!context) {
        throw new Error("useSearchContext must be used within a SearchProvider")
    }
    return context
}

