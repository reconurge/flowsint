import { Button } from '@/components/ui/button'
import React, { useCallback } from 'react'
import { toast } from 'sonner'
import { performSearch } from '@/lib/actions/search'
const SearchEmail = ({ sketch_id, email }: { sketch_id: string, email: string }) => {

    const [disabled, setDisabled] = React.useState(false)
    const handleCheckEmail = useCallback(() => {
        // @ts-ignore
        setDisabled(true)
        if (!sketch_id && !email) return
        // @ts-ignore
        toast.promise(performSearch(email, 'email', sketch_id), {
            loading: "Loading...",
            success: () => {
                setDisabled(false)
                return `Scan on ${email} has been launched.`
            },
            error: (error: any) => {
                setDisabled(false)
                return (
                    <div className="overflow-hidden">
                        <p className="font-bold">An error occured.</p>
                        <pre className="overflow-auto">
                            <code>{JSON.stringify(error, null, 2)}</code>
                        </pre>
                    </div>
                )
            },
        })
    }, [email, sketch_id])
    return (
        <Button disabled={disabled} onClick={handleCheckEmail}>Search socials</Button>
    )
}

export default SearchEmail