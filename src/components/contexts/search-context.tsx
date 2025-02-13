"use client"
import type React from "react"
import { createContext, useContext, type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
            <Dialog open={openSearchModal} onOpenChange={handleCloseModal}>
                <DialogContent className={results ? "sm:max-w-[950px]" : "sm:max-w-[450px]"}>
                    <DialogHeader>
                        <DialogTitle>New search</DialogTitle>
                        <DialogDescription>Make a new keyword associated research.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onSubmitNewSearch}>
                        <div className="flex flex-col gap-3">
                            <Card className="p-4">
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
                        <DialogFooter className="mt-4">
                            <Button variant="outline" onClick={handleCloseModal}>
                                Close
                            </Button>
                            {!results && (
                                <Button disabled={isLoading} type="submit">
                                    {isLoading ? "Saving..." : "Save"}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </SearchContext.Provider>
    )
}

export const useSearchContext = (): SearchContextType => {
    const context = useContext(SearchContext)
    if (!context) {
        throw new Error("useSearchContext must be used within a SearchProvider")
    }
    return context
}

